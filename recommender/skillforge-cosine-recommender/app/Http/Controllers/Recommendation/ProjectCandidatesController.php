<?php

namespace App\Http\Controllers\Recommendation;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use App\Services\Recommendation\RecommendationService;

class ProjectCandidatesController extends Controller
{
    public function __invoke(Request $request, int $projectId, RecommendationService $service)
    {
        $topN = (int) $request->query('top_n', config('recommendation.top_n_default'));
        $semiMin = (float) $request->query('semi_active_min_similarity', config('recommendation.semi_active_min_similarity_default'));

        // Optional: demo mode using JSON file instead of DB
        $source = $request->query('source', 'db'); // 'db' | 'json'

        $result = $service->recommendCandidates($projectId, [
            'top_n' => $topN,
            'semi_active_min_similarity' => $semiMin,
            'source' => $source,
        ]);

        return response()->json($result);
    }
}
