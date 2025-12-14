<?php

namespace App\Modules\AI\Domain\DTO;

class RecommendationRequest
{
    public function __construct(
        public readonly int $userId,
        public readonly string $context,
        public readonly array $filters = []
    ) {
    }
}
