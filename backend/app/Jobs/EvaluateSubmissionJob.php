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

        try {
            Log::info("Evaluating submission {$submission->id}...");

            // Update status to evaluating
            $submission->update(['status' => 'evaluating']);

            // Call the evaluation service
            $evaluation = $evaluationService->evaluateSubmission($submission);

            // Check if evaluator was unavailable
            if (($evaluation['status'] ?? null) === 'unavailable') {
                $this->handleUnavailableEvaluator($submission, $evaluation, $aiLogger);
                return;
            }

            // Store the evaluation results
            $submission->ai_score = $evaluation['score'];
            $submission->ai_feedback = $evaluation['feedback'];
            $submission->ai_metadata = $evaluation['metadata'];
            $submission->is_evaluated = true;
            $submission->evaluated_at = now();
            $submission->status = 'evaluated';
            $submission->save();

            // Create ai_evaluations record for audit trail
            AiEvaluation::create([
                'submission_id' => $submission->id,
                'provider' => 'openai',
                'model' => $evaluation['metadata']['model'] ?? null,
                'status' => 'succeeded',
                'score' => $evaluation['score'],
                'feedback' => $evaluation['feedback'],
                'rubric_scores' => $evaluation['metadata']['rubric_scores'] ?? null,
                'metadata' => $this->sanitizeMetadata($evaluation['metadata']),
                'started_at' => now()->subSeconds(5),
                'completed_at' => now(),
            ]);

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
     * Handle the case when evaluator is unavailable.
     */
    private function handleUnavailableEvaluator(Submission $submission, array $evaluation, AiLogger $aiLogger): void
    {
        $submission->status = 'needs_manual_review';
        $submission->ai_feedback = $evaluation['feedback'];
        $submission->ai_metadata = $evaluation['metadata'];
        $submission->is_evaluated = false;
        $submission->save();

        // Create ai_evaluations record with failed status
        AiEvaluation::create([
            'submission_id' => $submission->id,
            'provider' => 'openai',
            'status' => 'failed',
            'error_message' => $evaluation['feedback'],
            'metadata' => $evaluation['metadata'],
            'started_at' => now(),
            'completed_at' => now(),
        ]);

        // Log the unavailability
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
            ]
        );

        Log::warning("Evaluator unavailable for submission {$submission->id}. Marked for manual review.");
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

        $submission->status = 'needs_manual_review';
        $submission->ai_feedback = 'Evaluation failed after multiple attempts. Awaiting manual review.';
        $submission->ai_metadata = [
            'error' => 'job_failed',
            'message' => $exception->getMessage(),
            'failed_at' => now()->toISOString(),
        ];
        $submission->save();

        // Create ai_evaluations record
        AiEvaluation::create([
            'submission_id' => $submission->id,
            'provider' => 'openai',
            'status' => 'failed',
            'error_message' => 'Job failed: ' . $exception->getMessage(),
            'metadata' => ['exception' => get_class($exception)],
            'started_at' => now(),
            'completed_at' => now(),
        ]);

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
