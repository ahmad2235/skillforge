<?php

namespace App\Services\Recommendation\Engines;

class Rules
{
    public static function adjustedRequiredLevel(array $project): string
    {
        $req = $project['required_level'] ?? 'beginner';
        $comp = $project['complexity'] ?? 'low';

        $order = config('recommendation.level_order');
        $compMinMap = config('recommendation.complexity_min_level');

        $compMin = $compMinMap[$comp] ?? 'beginner';

        return ($order[$req] ?? 0) >= ($order[$compMin] ?? 0) ? $req : $compMin;
    }

    public static function expectedSkill(string $neededLevel): float
    {
        $map = config('recommendation.expected_skill_by_level');
        return (float)($map[$neededLevel] ?? 0.55);
    }
}
