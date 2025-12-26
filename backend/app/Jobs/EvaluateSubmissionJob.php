<?php

namespace App\Jobs;

use App\Modules\Learning\Infrastructure\Models\Submission;
use App\Modules\Learning\Infrastructure\Models\AiEvaluation;
use App\Modules\AI\Application\Services\TaskEvaluationService;
use App\Modules\AI\Application\Services\AiLogger;
use App\Notifications\TaskEvaluationComplete;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class EvaluateSubmissionJob implements ShouldQueue
{
    use Queueable;

    /**
     * The number of times the job may be attempted.
     */
    public $tries = 3;

    /**
     * The number of seconds to wait before retrying the job.
     */
    public $backoff = [10, 30, 60];

    private int $submissionId;

    /**
     * Create a new job instance.
     */
    public function __construct(int $submissionId)
    {
        $this->submissionId = $submissionId;
    }

    /**
     * Execute the job.
     */
    public function handle(TaskEvaluationService $evaluationService, AiLogger $aiLogger): void
    {
        $submission = Submission::find($this->submissionId);
        
        if (!$submission) {
            Log::error("Submission {$this->submissionId} not found for evaluation");
            return;
        }

        Log::info("EvaluateSubmissionJob invoked", ['submission_id' => $submission->id]);

        try {
            Log::info("Evaluating submission {$submission->id}...");

            // Update canonical evaluation status to evaluating
            $submission->update(['status' => 'evaluating', 'evaluation_status' => 'evaluating']);
            Log::info("Submission {$submission->id} evaluation_status set to evaluating", ['evaluation_request_id' => null]);

            // Create an evaluation_request_id to track this run
            $evaluationRequestId = (string) \Illuminate\Support\Str::uuid();
            Log::info("Evaluation run started", ['submission_id' => $submission->id, 'evaluation_request_id' => $evaluationRequestId]);


            // Call the evaluation service
            $evaluation = $evaluationService->evaluateSubmission($submission);

            // Check if evaluator was unavailable
            if (($evaluation['status'] ?? null) === 'unavailable') {
                // Map unavailable outcome to manual_review or skipped depending on metadata
                $outcome = $evaluation['metadata']['evaluation_outcome'] ?? 'manual_review';
                $submission->evaluation_status = $outcome === 'skipped' ? 'skipped' : 'manual_review';
                $submission->save();

                $this->handleUnavailableEvaluator($submission, $evaluation, $aiLogger);
                return;
            }

            // Store the evaluation results (snapshot fields)
            $submission->ai_score = $evaluation['score'];
            $submission->ai_feedback = $evaluation['feedback'];
            $submission->ai_metadata = $evaluation['metadata'];
            $submission->final_score = $evaluation['score'] ?? null;
            $submission->rubric_scores = $evaluation['metadata']['rubric_scores'] ?? null;
            $submission->is_evaluated = true;
            $submission->evaluated_at = now();
            $submission->status = 'evaluated';
            $submission->save();

            // Create ai_evaluations record for audit trail and include evaluation_request_id
            $ae = AiEvaluation::create([
                'submission_id' => $submission->id,
                'evaluation_request_id' => $evaluationRequestId,
                'provider' => 'openai',
                'model' => $evaluation['metadata']['model'] ?? null,
                'status' => 'succeeded',
                'semantic_status' => 'completed',
                'score' => $evaluation['score'],
                'feedback' => $evaluation['feedback'],
                'rubric_scores' => $evaluation['metadata']['rubric_scores'] ?? null,
                'metadata' => $this->sanitizeMetadata($evaluation['metadata']),
                'started_at' => now()->subSeconds(5),
                'completed_at' => now(),
            ]);

            // Before overwriting the submission snapshot, ensure this job is writing the latest run
            // If a newer latest_ai_evaluation exists and has a different evaluation_request_id, do not overwrite
            $submission->refresh();
            if ($submission->latest_ai_evaluation_id) {
                $latest = $submission->latestAiEvaluationResolved();
                if ($latest && $latest->evaluation_request_id && $latest->evaluation_request_id !== $evaluationRequestId && $latest->completed_at && $latest->completed_at->gt($ae->completed_at)) {
                    Log::warning("Stale evaluation job for submission {$submission->id}; new evaluation exists (ae={$latest->id}). Skipping snapshot update.");
                } else {
                    // Update submission snapshot and canonical evaluation_status
                    $submission->ai_score = $evaluation['score'];
                    $submission->ai_feedback = $evaluation['feedback'];
                    $submission->ai_metadata = $evaluation['metadata'];
                    $submission->final_score = $evaluation['score'] ?? null;
                    $submission->rubric_scores = $evaluation['metadata']['rubric_scores'] ?? null;
                    $submission->is_evaluated = true;
                    $submission->evaluated_at = now();
                    $submission->evaluation_status = 'completed';
                    $submission->latest_ai_evaluation_id = $ae->id;
                    $submission->save();
                }
            } else {
                $submission->ai_score = $evaluation['score'];
                $submission->ai_feedback = $evaluation['feedback'];
                $submission->ai_metadata = $evaluation['metadata'];
                $submission->final_score = $evaluation['score'] ?? null;
                $submission->rubric_scores = $evaluation['metadata']['rubric_scores'] ?? null;
                $submission->is_evaluated = true;
                $submission->evaluated_at = now();
                $submission->evaluation_status = 'completed';
                $submission->latest_ai_evaluation_id = $ae->id;
                $submission->save();
            }

            Log::info("Submission {$submission->id} evaluated successfully. Score: {$evaluation['score']}");

            // Log to ai_logs with sanitized data
            $aiLogger->log(
                'task_evaluation',
                $submission->user_id,
                [
                    'submission_id' => $submission->id,
                    'task_id' => $submission->task_id,
                    'file_size' => $submission->attachment_url ? (file_exists(storage_path('app' . $submission->attachment_url)) ? filesize(storage_path('app' . $submission->attachment_url)) : 0) : 0,
                ],
                [
                    'score' => $evaluation['score'],
                    'status' => 'succeeded',
                ],
                [
                    'model' => $evaluation['metadata']['model'] ?? null,
                ]
            );

            if (config('skillforge.notifications.enabled') && config('skillforge.notifications.task_evaluation_complete')) {
                $submission->user?->notify(new TaskEvaluationComplete($submission));
            }

        } catch (\Exception $e) {
            Log::error("Failed to evaluate submission {$this->submissionId}: {$e->getMessage()}");
            $this->handleEvaluationFailure($submission, $e, $aiLogger);
            throw $e; // Re-throw to trigger retry
        }
    }

    /**
     * Handle the case when evaluator is unavailable (manual review required).
     * 
     * When AI is disabled or evaluation fails, we must:
     * - NOT set score snapshots (keep ai_score, final_score, rubric_scores NULL)
     * - Mark submission for manual review (set evaluation_status = 'manual_review')
     * - Create ai_evaluations record with status='failed'
     */
    private function handleUnavailableEvaluator(Submission $submission, array $evaluation, AiLogger $aiLogger): void
    {
        // Clear snapshot fields - manual review means no AI score
        $submission->ai_score = null;
        $submission->final_score = null;
        $submission->rubric_scores = null;
        $submission->ai_feedback = $evaluation['feedback'];
        $submission->ai_metadata = $evaluation['metadata'];
        $submission->is_evaluated = false;
        $submission->evaluated_at = null;
        // Don't modify the submission lifecycle 'status' field here; use evaluation_status instead
        $submission->save();

        // Select ai_evaluation status based on evaluation metadata outcome
        $outcome = $evaluation['metadata']['evaluation_outcome'] ?? null;
        $aiStatus = in_array($outcome, ['skipped', 'manual_review', 'failed'], true) ? $outcome : 'failed';

        // Always use 'failed' status in DB enum for unavailable/manual-review scenarios
        // (db only understands queued|running|succeeded|failed; 'manual_review' is a metadata concept)
        $dbStatus = 'failed';
        $metadata = $evaluation['metadata'] ?? [];
        // Ensure metadata has the right outcome
        if (!isset($metadata['evaluation_outcome']) || !in_array($metadata['evaluation_outcome'], ['manual_review', 'skipped', 'failed'], true)) {
            $metadata['evaluation_outcome'] = 'manual_review';
        }

        $ae = AiEvaluation::create([
            'submission_id' => $submission->id,
            'evaluation_request_id' => $evaluation['metadata']['evaluation_request_id'] ?? null,
            'provider' => 'openai',
            'status' => $dbStatus,
            'semantic_status' => $aiStatus,
            'score' => null, // Explicitly null - no AI score for manual review
            'feedback' => $evaluation['feedback'] ?? null,
            'error_message' => $evaluation['feedback'] ?? null,
            'metadata' => $metadata,
            'started_at' => now(),
            'completed_at' => now(),
        ]);

        // Update latest pointer and canonical evaluation_status
        $submission->latest_ai_evaluation_id = $ae->id;
        $submission->evaluation_status = $aiStatus === 'skipped' ? 'skipped' : 'manual_review';
        $submission->save();

        // Log the unavailability / manual review
        $aiLogger->log(
            'task_evaluation_unavailable',
            $submission->user_id,
            [
                'submission_id' => $submission->id,
                'task_id' => $submission->task_id,
            ],
            [
                'status' => 'unavailable',
                'reason' => $evaluation['metadata']['reason'] ?? 'unknown',
                'outcome' => $aiStatus,
            ]
        );

        Log::warning("Evaluator unavailable for submission {$submission->id}. Marked for manual review. Outcome: {$aiStatus}", ['evaluation_request_id' => $ae->evaluation_request_id]);
    }

    /**
     * Handle job failure after all retries exhausted.
     */
    public function failed(\Throwable $exception): void
    {
        $submission = Submission::find($this->submissionId);
        
        if (!$submission) {
            return;
        }

        // Do not set legacy 'status' here; mark the evaluation_status as failed for auditing
        $submission->evaluation_status = 'failed';
        $submission->ai_feedback = 'Evaluation failed after multiple attempts. Awaiting manual review.';
        $submission->ai_metadata = [
            'error' => 'job_failed',
            'message' => $exception->getMessage(),
            'failed_at' => now()->toISOString(),
        ];
        $submission->save();
        Log::error("Submission {$submission->id} evaluation failed and marked for manual review", ['error' => $exception->getMessage()]);

        // Create ai_evaluations record
        $ae = AiEvaluation::create([
            'submission_id' => $submission->id,
            'provider' => 'openai',
            'status' => 'failed',
            'error_message' => 'Job failed: ' . $exception->getMessage(),
            'metadata' => ['exception' => get_class($exception), 'evaluation_outcome' => 'manual_review'],
            'started_at' => now(),
            'completed_at' => now(),
        ]);

        // Ensure submission points to this latest ai_evaluation row
        $submission->latest_ai_evaluation_id = $ae->id;
        // Mark the evaluation_status as failed (do not modify legacy 'status' lifecycle)
        $submission->evaluation_status = 'failed';
        $submission->ai_feedback = 'Evaluation failed after multiple attempts. Awaiting manual review.';
        $submission->ai_metadata = ['error' => 'job_failed', 'message' => $exception->getMessage(), 'failed_at' => now()->toISOString()];
        $submission->save();

        // Log the failure
        app(AiLogger::class)->log(
            'task_evaluation_failed',
            $submission->user_id,
            [
                'submission_id' => $submission->id,
                'task_id' => $submission->task_id,
            ],
            [
                'status' => 'failed',
                'error' => $exception->getMessage(),
            ]
        );

        Log::error("EvaluateSubmissionJob failed permanently for submission {$submission->id}: {$exception->getMessage()}");
    }

    /**
     * Handle evaluation failure during job execution.
     */
    private function handleEvaluationFailure(Submission $submission, \Exception $e, AiLogger $aiLogger): void
    {
        // Don't update submission here - let retry mechanism work
        // Only log for debugging
        $aiLogger->log(
            'task_evaluation_error',
            $submission->user_id,
            [
                'submission_id' => $submission->id,
                'attempt' => $this->attempts(),
            ],
            [
                'error' => $e->getMessage(),
            ]
        );
    }

    /**
     * Sanitize metadata to avoid storing sensitive data.
     */
    private function sanitizeMetadata(array $metadata): array
    {
        // Remove any potentially large or sensitive fields
        $sanitized = $metadata;
        unset($sanitized['raw_response']);
        unset($sanitized['file_content']);
        unset($sanitized['student_code']);
        
        return $sanitized;
    }
}
