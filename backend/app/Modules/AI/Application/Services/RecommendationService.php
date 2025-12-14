<?php

namespace App\Modules\AI\Application\Services;

use App\Modules\Projects\Infrastructure\Models\Project;
use Illuminate\Support\Collection;
use App\Modules\AI\Domain\DTO\RecommendationRequest;
use App\Modules\AI\Domain\DTO\RecommendationResult;

class RecommendationService
{
    public function __construct(
        private readonly RuleBasedRecommendationService $ruleBased,
        private readonly RecommendationLoggingService $logger,
    ) {
    }

    /**
     * Rank candidate students for a given project (existing contract preserved).
     */
    public function rankCandidates(Project $project, Collection $candidates): array
    {
        $result = $this->ruleBased->recommend(new RecommendationRequest(
            userId: 0,
            context: 'project_candidates',
            filters: [
                'project' => $project,
                'candidates' => $candidates,
            ],
        ));

        $this->logger->log(
            'project_candidates',
            $project->id,
            array_map(function ($item) {
                return [
                    'id' => $item['id'],
                    'score' => $item['score'],
                    'reason' => $item['reason'] ?? null,
                ];
            }, $result->toArray()),
        );

        // Keep legacy shape with student object attached
        return collect($result->toArray())
            ->map(function ($item) {
                return [
                    'student' => $item['student'] ?? null,
                    'score' => $item['score'],
                    'reason' => $item['reason'] ?? null,
                ];
            })
            ->all();
    }

    /**
     * New generic recommend method using DTO.
     */
    public function recommend(RecommendationRequest $request): RecommendationResult
    {
        $result = $this->ruleBased->recommend($request);

        $this->logger->log(
            $request->context,
            $request->filters['context_id'] ?? null,
            array_map(function ($item) {
                return [
                    'id' => $item['id'],
                    'score' => $item['score'],
                    'reason' => $item['reason'] ?? null,
                ];
            }, $result->toArray()),
        );

        return $result;
    }
}
