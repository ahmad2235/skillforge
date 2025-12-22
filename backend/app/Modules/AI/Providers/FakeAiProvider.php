<?php

namespace App\Modules\AI\Providers;

use App\Modules\Learning\Infrastructure\Models\Submission;

/**
 * Fake AI provider for development and tests.
 * Deterministic output based on submission id and answer_text length.
 */
class FakeAiProvider implements AiProviderInterface
{
    public function evaluate(Submission $submission): array
    {
        $text = (string) $submission->answer_text;
        $length = mb_strlen($text);

        // Deterministic score: scale length to 0-100 and add small id offset
        $base = min(100, (int) ($length * 2));
        $offset = $submission->id % 7;
        $score = min(100, $base + $offset);

        $feedback = "Auto-eval (submission {$submission->id}): length={$length}, score={$score}";

        // Build rubric scores if task has rubric
        $rubricScores = null;
        $taskRubric = $submission->task->rubric ?? null;
        if (is_array($taskRubric)) {
            $rubricScores = [];
            foreach ($taskRubric as $i => $criterion) {
                $max = $criterion['max_points'] ?? 10;
                // distribute proportional to length and position to vary scores
                $partial = (int) round(($length / max(1, 100)) * $max) + ($i % 3);
                $rubricScores[] = [
                    'criterion' => $criterion['criterion'] ?? "criterion_{$i}",
                    'score' => min($max, max(0, $partial)),
                    'max_points' => $max,
                ];
            }
        }

        $metadata = [
            'tokens_used' => max(1, (int) ceil($length / 2)),
            'model' => 'fake-model',
            'prompt_version' => 'v1-fake',
            'provider' => 'fake',
        ];

        return [
            'provider' => 'fake',
            'model' => 'fake-model',
            'prompt_version' => 'v1-fake',
            'score' => $score,
            'feedback' => $feedback,
            'rubric_scores' => $rubricScores,
            'metadata' => $metadata,
        ];
    }
}
