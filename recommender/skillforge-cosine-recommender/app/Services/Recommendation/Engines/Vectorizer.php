<?php

namespace App\Services\Recommendation\Engines;

class Vectorizer
{
    public static function studentVector(array $student, array $domainVocab): array
    {
        $fields = $student;

        $domain = $fields['domain'] ?? null;
        $level = $fields['level'] ?? 'beginner';
        $activity = $fields['activity_profile'] ?? 'low-activity';

        $ps = $fields['profile_settings'] ?? [];
        $avgRange = $ps['avg_score_range'] ?? [];
        $weight = (float)($ps['weight'] ?? 0.0);

        $mid = self::avgScoreMidpoint($avgRange);     // 0..100
        $skillNum = self::clamp($mid / 100.0, 0.0, 1.0);

        $levelMap = config('recommendation.level_to_num');
        $activityMap = config('recommendation.activity_to_num');

        $vec = [];
        $vec = array_merge($vec, self::oneHot($domain, $domainVocab));
        $vec[] = (float)($levelMap[$level] ?? 0.0);
        $vec[] = (float)($activityMap[$activity] ?? 0.0);
        $vec[] = $skillNum;
        $vec[] = self::clamp($weight, 0.0, 1.0);

        return $vec;
    }

    public static function projectVector(array $project, array $domainVocab): array
    {
        $domain = $project['domain'] ?? null;
        $needed = Rules::adjustedRequiredLevel($project);

        $levelMap = config('recommendation.level_to_num');
        $expectedSkill = Rules::expectedSkill($needed);

        $vec = [];
        $vec = array_merge($vec, self::oneHot($domain, $domainVocab));
        $vec[] = (float)($levelMap[$needed] ?? 0.0);
        $vec[] = 1.0; // prefer active
        $vec[] = self::clamp($expectedSkill, 0.0, 1.0);
        $vec[] = 1.0; // reliability always valued

        return $vec;
    }

    private static function oneHot(?string $value, array $vocab): array
    {
        $out = [];
        foreach ($vocab as $v) {
            $out[] = ($value !== null && $value === $v) ? 1.0 : 0.0;
        }
        return $out;
    }

    private static function avgScoreMidpoint($range): float
    {
        if (!is_array($range) || count($range) !== 2) {
            return 0.0;
        }
        return ((float)$range[0] + (float)$range[1]) / 2.0;
    }

    private static function clamp(float $x, float $lo, float $hi): float
    {
        return max($lo, min($hi, $x));
    }
}
