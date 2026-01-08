<?php

namespace App\Jobs;

use App\Modules\Learning\Infrastructure\Models\Submission;
use App\Modules\Learning\Infrastructure\Models\AiEvaluation;
use App\Modules\AI\Application\Services\AiLogger;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

/**
 * Scheduled cleanup job to ensure no submissions remain stuck in non-terminal states.
 * 
 * This job runs periodically (via scheduler) and transitions any submission that has been
 * in 'queued' or 'evaluating' state for too long to a terminal state (timed_out).
 * 
 * This acts as a safety net for scenarios where:
 * - The queue worker died mid-evaluation
 * - The job timeout was hit but failed() wasn't called (process killed)
 * - Network partition prevented job completion notification
 * - Any other edge case that leaves submissions in limbo
 */
class CleanupStuckSubmissionsJob implements ShouldQueue
{
    use Queueable;

    /**
     * Maximum time (in minutes) a submission can be in 'evaluating' state before cleanup.
     * Default: 15 minutes (job timeout is 120s × 3 retries + backoff = ~7 min max normal operation)
     */
    private int $evaluatingThresholdMinutes = 15;

    /**
     * Maximum time (in minutes) a submission can be in 'queued' state before cleanup.
     * Default: 30 minutes (queue might be backed up, but 30 min is unreasonable)
     */
    private int $queuedThresholdMinutes = 30;

    /**
     * Execute the job.
     */
    public function handle(AiLogger $aiLogger): void
    {
        $cleanedCount = 0;

        // 1. Find submissions stuck in 'evaluating' state for too long
        $stuckEvaluating = Submission::where('evaluation_status', Submission::EVAL_EVALUATING)
            ->where('updated_at', '<', Carbon::now()->subMinutes($this->evaluatingThresholdMinutes))
            ->get();

        foreach ($stuckEvaluating as $submission) {
            $this->transitionToTimedOut($submission, 'evaluating', $aiLogger);
            $cleanedCount++;
        }

        // 2. Find submissions stuck in 'queued' state for too long
        $stuckQueued = Submission::where('evaluation_status', Submission::EVAL_QUEUED)
            ->where('updated_at', '<', Carbon::now()->subMinutes($this->queuedThresholdMinutes))
            ->get();

        foreach ($stuckQueued as $submission) {
            $this->transitionToTimedOut($submission, 'queued', $aiLogger);
            $cleanedCount++;
        }

        if ($cleanedCount > 0) {
            Log::warning("CleanupStuckSubmissionsJob cleaned up {$cleanedCount} stuck submissions");
        } else {
            Log::info("CleanupStuckSubmissionsJob: No stuck submissions found");
        }
    }

    /**
     * Transition a stuck submission to timed_out terminal state.
     */
    private function transitionToTimedOut(Submission $submission, string $previousState, AiLogger $aiLogger): void
    {
        $stuckDuration = $submission->updated_at->diffInMinutes(now());
        
        // Update submission with terminal state
        $submission->evaluation_status = Submission::EVAL_TIMED_OUT;
        $submission->ai_feedback = "Evaluation timed out (stuck in {$previousState} for {$stuckDuration} minutes). Your submission will be reviewed manually.";
        $submission->ai_metadata = array_merge($submission->ai_metadata ?? [], [
            'cleanup_reason' => 'stuck_submission',
            'previous_state' => $previousState,
            'stuck_duration_minutes' => $stuckDuration,
            'cleaned_at' => now()->toISOString(),
        ]);
        $submission->save();

        // Create ai_evaluations audit record
        $ae = AiEvaluation::create([
            'submission_id' => $submission->id,
            'provider' => 'system',
            'status' => 'failed',
            'semantic_status' => 'timed_out',
            'error_message' => "Cleaned up: stuck in {$previousState} for {$stuckDuration} minutes",
            'metadata' => [
                'evaluation_outcome' => 'timed_out',
                'cleanup_reason' => 'stuck_submission',
                'previous_state' => $previousState,
            ],
            'started_at' => $submission->updated_at,
            'completed_at' => now(),
        ]);

        $submission->latest_ai_evaluation_id = $ae->id;
        $submission->save();

        // Log for audit
        $aiLogger->log(
            'submission_cleanup',
            $submission->user_id,
            [
                'submission_id' => $submission->id,
                'task_id' => $submission->task_id,
            ],
            [
                'status' => 'timed_out',
                'previous_state' => $previousState,
                'stuck_duration_minutes' => $stuckDuration,
            ]
        );

        Log::info("Cleaned up stuck submission {$submission->id}: {$previousState} -> timed_out (stuck {$stuckDuration} min)");
    }
}
