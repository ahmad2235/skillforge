<?php

namespace App\Modules\AI\Application\Services;

use App\Models\User;
use App\Modules\AI\Domain\Contracts\RecommendationContract;
use App\Modules\AI\Domain\DTO\RecommendationRequest;
use App\Modules\AI\Domain\DTO\RecommendationResult;
use App\Modules\Projects\Infrastructure\Models\Project;
use Illuminate\Support\Collection;

class RuleBasedRecommendationService implements RecommendationContract
{
    public function recommend(RecommendationRequest $request): RecommendationResult
    {
        $filters = $request->filters;
        /** @var Collection<User>|null $candidates */
        $candidates = $filters['candidates'] ?? null;
        /** @var Project|null $project */
        $project = $filters['project'] ?? null;

        if (! $candidates instanceof Collection || ! $project) {
            return new RecommendationResult([]);
        }

        $ranked = $candidates
            ->map(function (User $student) use ($project) {
                $score = 0;

                if ($student->domain && $student->domain === $project->domain) {
                    $score += 40;
                }

                if ($student->level && $project->required_level) {
                    if ($student->level === $project->required_level) {
                        $score += 40;
                    }
                }

                return [
                    'id' => $student->id,
                    'score' => $score,
                    'reason' => 'Rule-based match on domain/level',
                    'student' => $student,
                ];
            })
            ->sortByDesc('score')
            ->values()
            ->all();

        return new RecommendationResult($ranked);
    }
}
