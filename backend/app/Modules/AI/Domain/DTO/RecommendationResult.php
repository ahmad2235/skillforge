<?php

namespace App\Modules\AI\Domain\DTO;

class RecommendationResult
{
    /** @var array<int, array{id:int, score:int, reason?:string}> */
    public array $ranked;

    public function __construct(array $ranked)
    {
        $this->ranked = $ranked;
    }

    public function toArray(): array
    {
        return $this->ranked;
    }
}
