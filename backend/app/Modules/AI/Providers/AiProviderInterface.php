<?php

namespace App\Modules\AI\Providers;

use App\Modules\Learning\Infrastructure\Models\Submission;

interface AiProviderInterface
{
    /**
     * Evaluate a submission and return an array with keys:
     * - provider, model, prompt_version, score, feedback, rubric_scores, metadata
     *
     * @param Submission $submission
     * @return array
     */
    public function evaluate(Submission $submission): array;
}
