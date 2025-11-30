<?php

namespace App\Modules\AI\Application\Services;

use App\Models\User;
use App\Modules\Projects\Infrastructure\Models\Project;
use Illuminate\Support\Collection;

class RecommendationService
{
    /**
     * Rank candidate students for a given project.
     *
     * For now this is just a placeholder:
     *  - Filter students by domain/level if possible
     *  - Assign a simple score
     *  - Sort descending by score
     *
     * Later, the AI engineer can plug in a real LLM-based scorer here.
     *
     * @param  Project    $project
     * @param  Collection $candidates  Collection<User>
     * @return array  list of ['student' => User, 'score' => int, 'reason' => string]
     */
    public function rankCandidates(Project $project, Collection $candidates): array
    {
        // Very naive scoring for now:
        return $candidates
            ->map(function (User $student) use ($project) {
                $score = 0;

                // Match domain
                if ($student->domain && $student->domain === $project->domain) {
                    $score += 40;
                }

                // Match level (beginner/intermediate/advanced)
                if ($student->level && $project->required_level) {
                    if ($student->level === $project->required_level) {
                        $score += 40;
                    }
                }

                // TODO: later add more features (placement score, portfolio, badges...)

                return [
                    'student' => $student,
                    'score'   => $score,
                    'reason'  => 'Simple rule-based score. To be replaced by AI.',
                ];
            })
            ->sortByDesc('score')
            ->values()
            ->all();
    }
}
