<?php

namespace App\Modules\AI\Application\Services;

use App\Modules\Learning\Infrastructure\Models\Submission;

class TaskEvaluationService
{
    /**
     * Evaluate a submission using AI.
     *
     * For now this is just a placeholder. The AI engineer can:
     *  - Call an external AI API (OpenAI, etc.)
     *  - Build a prompt using the submission content
     *  - Parse the response into: score, feedback, metadata
     */
    public function evaluateSubmission(Submission $submission): array
    {
        // TODO: AI engineer implements real logic here.
        // Keep the structure stable so the rest of the app does not need to change.

        return [
            'score'    => null,        // integer 0–100, or null if not available yet
            'feedback' => null,        // short text feedback for the student
            'metadata' => [],          // any extra info the AI wants to store
        ];
    }
}
