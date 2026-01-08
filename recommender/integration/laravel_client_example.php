<?php

namespace App\Services\Recommendation;

use Illuminate\Support\Facades\Http;

class RecommenderHttpClient
{
    public function candidates(int $projectId, int $topN = 7, float $semiMin = 0.80): array
    {
        $baseUrl = config('services.recommender.base_url', 'http://localhost:8000');

        $response = Http::timeout(5)->get("{$baseUrl}/projects/{$projectId}/candidates", [
            'top_n' => $topN,
            'semi_active_min_similarity' => $semiMin,
        ]);

        $response->throw();
        return $response->json();
    }
}
