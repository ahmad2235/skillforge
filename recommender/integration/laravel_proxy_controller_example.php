<?php

namespace App\Http\Controllers\Recommendation;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use App\Services\Recommendation\RecommenderHttpClient;

class ProjectCandidatesProxyController extends Controller
{
    public function __invoke(Request $request, int $projectId, RecommenderHttpClient $client)
    {
        $topN = (int) $request->query('top_n', 7);
        $semiMin = (float) $request->query('semi_active_min_similarity', 0.80);

        $payload = $client->candidates($projectId, $topN, $semiMin);

        return response()->json($payload);
    }
}
