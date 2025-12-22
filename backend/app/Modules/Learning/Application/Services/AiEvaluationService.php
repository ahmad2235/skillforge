<?php

namespace App\Modules\Learning\Application\Services;

use App\Modules\Learning\Infrastructure\Models\AiEvaluation;
use App\Modules\Learning\Infrastructure\Models\Submission;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Service for managing AI evaluations with hybrid storage:
 * - ai_evaluations table: append-only history
 * - submissions table: latest snapshot for fast reads
 */
class AiEvaluationService
{
    /**
     * Create a new AI evaluation record and update submission snapshot.
     * 
     * @param Submission $submission
     * @param array $evaluationData [
     *   'provider' => 'openai',
     *   'model' => 'gpt-4',
     *   'prompt_version' => 'v1.0',
     *   'score' => 85.5,
     *   'feedback' => 'Good work...',
     *   'rubric_scores' => [...],
     *   'metadata' => [...],
     * ]
     * @return AiEvaluation
     */
    public function recordEvaluation(Submission $submission, array $evaluationData): AiEvaluation
    {
        return DB::transaction(function () use ($submission, $evaluationData) {
            // 1. Create new AI evaluation record (append-only history)
            $aiEvaluation = AiEvaluation::create([
                'submission_id' => $submission->id,
                'provider' => $evaluationData['provider'] ?? 'openai',
                'model' => $evaluationData['model'] ?? null,
                'prompt_version' => $evaluationData['prompt_version'] ?? null,
                'status' => 'succeeded',
                'score' => $evaluationData['score'] ?? null,
                'feedback' => $evaluationData['feedback'] ?? null,
                'rubric_scores' => $evaluationData['rubric_scores'] ?? null,
                'metadata' => $evaluationData['metadata'] ?? null,
                'started_at' => now(),
                'completed_at' => now(),
            ]);

            // 2. Update submission snapshot (latest values for fast UI reads)
            $updateData = [
                'ai_score' => isset($evaluationData['score']) ? (int) $evaluationData['score'] : null,
                'ai_feedback' => $evaluationData['feedback'] ?? null,
                'ai_metadata' => $evaluationData['metadata'] ?? null,
                'final_score' => $evaluationData['score'] ?? null,
                'rubric_scores' => $evaluationData['rubric_scores'] ?? null,
                'evaluated_by' => 'system',
                'is_evaluated' => true,
                'evaluated_at' => now(),
                'status' => 'evaluated',
            ];

            // 3. Add FK to latest evaluation (if column exists)
            if (Schema::hasColumn('submissions', 'latest_ai_evaluation_id')) {
                $updateData['latest_ai_evaluation_id'] = $aiEvaluation->id;
            }

            $submission->update($updateData);

            return $aiEvaluation;
        });
    }

    /**
     * Record a failed AI evaluation attempt.
     */
    public function recordFailure(Submission $submission, string $errorMessage, array $context = []): AiEvaluation
    {
        return AiEvaluation::create([
            'submission_id' => $submission->id,
            'provider' => $context['provider'] ?? 'openai',
            'model' => $context['model'] ?? null,
            'prompt_version' => $context['prompt_version'] ?? null,
            'status' => 'failed',
            'error_message' => $errorMessage,
            'metadata' => $context,
            'started_at' => now(),
            'completed_at' => now(),
        ]);
    }

    /**
     * Convenience wrapper: record a succeeded evaluation (alias for recordEvaluation).
     */
    public function recordSucceeded(Submission $submission, array $evaluationData): AiEvaluation
    {
        return $this->recordEvaluation($submission, $evaluationData);
    }

    /**
     * Convenience wrapper: record a failed evaluation (alias for recordFailure).
     */
    public function recordFailed(Submission $submission, string $errorMessage, array $context = []): AiEvaluation
    {
        return $this->recordFailure($submission, $errorMessage, $context);
    }

    /**
     * Get evaluation history for a submission.
     */
    public function getEvaluationHistory(Submission $submission): \Illuminate\Database\Eloquent\Collection
    {
        return $submission->aiEvaluations()
            ->orderBy('created_at', 'desc')
            ->get();
    }
}
