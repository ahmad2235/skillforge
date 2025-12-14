<?php

namespace App\Modules\AI\Domain\Contracts;

use App\Modules\AI\Domain\DTO\RecommendationRequest;
use App\Modules\AI\Domain\DTO\RecommendationResult;

interface RecommendationContract
{
    public function recommend(RecommendationRequest $request): RecommendationResult;
}
