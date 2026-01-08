<?php

namespace App\Services\Recommendation;

use App\Services\Recommendation\Contracts\ProjectRepository;
use App\Services\Recommendation\Contracts\StudentRepository;
use App\Services\Recommendation\Engines\CosineRecommender;
use App\Services\Recommendation\Repositories\EloquentProjectRepository;
use App\Services\Recommendation\Repositories\EloquentStudentRepository;
use App\Services\Recommendation\Repositories\JsonProjectRepository;
use App\Services\Recommendation\Repositories\JsonStudentRepository;

class RecommendationService
{
    public function recommendCandidates(int $projectId, array $options = []): array
    {
        $topN = (int)($options['top_n'] ?? config('recommendation.top_n_default'));
        $semiMin = (float)($options['semi_active_min_similarity'] ?? config('recommendation.semi_active_min_similarity_default'));
        $source = (string)($options['source'] ?? 'db');

        [$projectsRepo, $studentsRepo] = $this->resolveRepositories($source);

        $project = $projectsRepo->findNormalized($projectId);
        if (!$project) {
            return [
                'error' => 'PROJECT_NOT_FOUND',
                'project_id' => $projectId,
            ];
        }

        $engine = new CosineRecommender(
            projectsRepo: $projectsRepo,
            studentsRepo: $studentsRepo
        );

        $candidates = $engine->recommend(
            project: $project,
            topN: $topN,
            semiActiveMinSimilarity: $semiMin
        );

        return [
            'project_id' => $projectId,
            'top_n' => $topN,
            'semi_active_min_similarity' => $semiMin,
            'candidates' => $candidates,
        ];
    }

    private function resolveRepositories(string $source): array
    {
        if ($source === 'json') {
            $path = config('recommendation.json_demo_path');
            return [new JsonProjectRepository($path), new JsonStudentRepository($path)];
        }

        // Default DB (Eloquent) repos
        return [new EloquentProjectRepository(), new EloquentStudentRepository()];
    }
}
