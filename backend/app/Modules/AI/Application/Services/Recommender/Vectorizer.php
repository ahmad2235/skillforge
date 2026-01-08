<?php

namespace App\Modules\AI\Application\Services\Recommender;

/**
 * Feature Vectorizer for Students and Projects
 * 
 * Converts student and project data into numeric feature vectors
 * suitable for cosine similarity computation.
 * 
 * Vector Structure (same dimensions for both):
 * [
 *   ...domain_one_hot,  // One-hot encoding of domain (e.g., [0,1] for frontend)
 *   level_num,          // Numeric level (0.0-1.0)
 *   activity_num,       // Numeric activity (0.0-1.0)
 *   skill_score,        // Average skill/score (0.0-1.0)
 *   reliability,        // Weight/reliability factor (0.0-1.0)
 * ]
 * 
 * Having identical dimensions is crucial for valid cosine similarity.
 */
class Vectorizer
{
    /**
     * Generate a one-hot encoded vector for a categorical value.
     *
     * @param string $value The value to encode
     * @param array<string> $vocabulary Ordered list of all possible values
     * @return array<float> One-hot encoded vector
     */
    public static function oneHot(string $value, array $vocabulary): array
    {
        return array_map(
            fn(string $v) => $v === $value ? 1.0 : 0.0,
            $vocabulary
        );
    }

    /**
     * Convert a student's data into a feature vector.
     *
     * @param array $student Student data with keys: domain, level, activity_profile, profile_settings
     * @param array<string> $domainVocab Ordered list of all domains
     * @return array<float> Feature vector
     */
    public static function studentVector(array $student, array $domainVocab): array
    {
        $levelToNum = config('recommender.level_to_num', [
            'beginner' => 0.0,
            'intermediate' => 0.5,
            'advanced' => 1.0,
        ]);

        $activityToNum = config('recommender.activity_to_num', [
            'low-activity' => 0.0,
            'semi-active' => 0.5,
            'active' => 1.0,
        ]);

        // Extract profile settings (may be nested or flat)
        $profileSettings = $student['profile_settings'] ?? [];
        
        // Calculate average skill from score range
        $avgScoreRange = $profileSettings['avg_score_range'] ?? [];
        $skillScore = self::avgScoreMidpoint($avgScoreRange) / 100.0;
        
        // Get reliability weight
        $weight = (float) ($profileSettings['weight'] ?? 0.0);

        // Build vector: [domain_one_hot..., level, activity, skill, reliability]
        return array_merge(
            self::oneHot((string) ($student['domain'] ?? ''), $domainVocab),
            [
                $levelToNum[(string) ($student['level'] ?? 'beginner')] ?? 0.0,
                $activityToNum[(string) ($student['activity_profile'] ?? 'low-activity')] ?? 0.0,
                max(0.0, min(1.0, $skillScore)),
                max(0.0, min(1.0, $weight)),
            ]
        );
    }

    /**
     * Convert a project's requirements into a feature vector.
     * 
     * This represents the "ideal candidate" profile for the project.
     *
     * @param array $project Project data with keys: domain, required_level, complexity
     * @param array<string> $domainVocab Ordered list of all domains
     * @return array<float> Feature vector
     */
    public static function projectVector(array $project, array $domainVocab): array
    {
        $levelToNum = config('recommender.level_to_num', [
            'beginner' => 0.0,
            'intermediate' => 0.5,
            'advanced' => 1.0,
        ]);

        // Use adjusted level (accounts for complexity)
        $neededLevel = Rules::adjustedRequiredLevel($project);
        $expectedSkill = Rules::expectedSkill($neededLevel);

        // Build vector: [domain_one_hot..., level, activity=1 (prefer active), skill, reliability=1]
        return array_merge(
            self::oneHot((string) ($project['domain'] ?? ''), $domainVocab),
            [
                $levelToNum[$neededLevel] ?? 0.0,
                1.0,  // Prefer active students (highest activity value)
                $expectedSkill,
                1.0,  // Always value reliability highly
            ]
        );
    }

    /**
     * Calculate midpoint of a score range.
     *
     * @param array $scoreRange Array with [min, max] values
     * @return float Midpoint value
     */
    private static function avgScoreMidpoint(array $scoreRange): float
    {
        if (count($scoreRange) !== 2) {
            return 0.0;
        }

        $min = (float) ($scoreRange[0] ?? 0);
        $max = (float) ($scoreRange[1] ?? 0);

        return ($min + $max) / 2.0;
    }
}
