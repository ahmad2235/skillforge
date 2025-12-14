<?php

namespace App\Jobs;

use App\Modules\Learning\Infrastructure\Models\Submission;
use App\Modules\AI\Application\Services\TaskEvaluationService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class EvaluateSubmissionJob implements ShouldQueue
{
    use Queueable;

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
    public function handle(TaskEvaluationService $evaluationService): void
    {
        try {
            $submission = Submission::findOrFail($this->submissionId);

            Log::info("Evaluating submission {$submission->id}...");

            // Call the evaluation service
            $evaluation = $evaluationService->evaluateSubmission($submission);

            // Store the evaluation results
            $submission->ai_score = $evaluation['score'];
            $submission->ai_feedback = $evaluation['feedback'];
            $submission->ai_metadata = $evaluation['metadata'];
            $submission->is_evaluated = true;
            $submission->evaluated_at = now();
            $submission->save();

            Log::info("Submission {$submission->id} evaluated successfully. Score: {$evaluation['score']}");

        } catch (\Exception $e) {
            Log::error("Failed to evaluate submission {$this->submissionId}: {$e->getMessage()}");
            throw $e;
        }
    }
}
