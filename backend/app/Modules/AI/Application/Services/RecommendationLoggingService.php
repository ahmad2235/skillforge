<?php

namespace App\Modules\AI\Application\Services;

use App\Models\RecommendationLog;

class RecommendationLoggingService
{
    public function log(
        string $contextType,
        ?int $contextId,
        array $rankedEntities,
        string $modelVersion = 'rule-based-v0',
        ?array $featuresUsed = null
    ): RecommendationLog {
        return RecommendationLog::create([
            'context_type' => $contextType,
            'context_id' => $contextId,
            'ranked_entities' => $rankedEntities,
            'model_version' => $modelVersion,
            'features_used' => $featuresUsed,
        ]);
    }
}
