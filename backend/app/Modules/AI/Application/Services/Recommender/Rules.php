<?php

namespace App\Modules\AI\Application\Services\Recommender;

/**
 * Business Rules for Project-Student Matching
 * 
 * Contains the core business logic for determining:
 * 1. Adjusted required level (complexity + required_level combination)
 * 2. Expected skill baseline for project vectors
 * 
 * These rules ensure that:
 * - High complexity projects require advanced students even if required_level is lower
 * - Students are matched to projects appropriate for their skill level
 */
class Rules
{
    /**
     * Calculate the adjusted required level for a project.
     * 
     * The adjusted level is the maximum of:
     *   - The project's explicit required_level
     *   - The minimum level implied by the project's complexity
     * 
     * Example: A project with required_level='beginner' and complexity='high'
     *          will have adjusted_level='advanced' (because high complexity
     *          requires at least advanced level).
     *
     * @param array $project Project data with 'required_level' and 'complexity' keys
     * @return string The adjusted level: 'beginner', 'intermediate', or 'advanced'
     */
    public static function adjustedRequiredLevel(array $project): string
    {
        $requiredLevel = $project['required_level'] ?? 'beginner';
        $complexity = $project['complexity'] ?? 'low';

        // Get ordering values for comparison
        $levelOrder = config('recommender.level_order', [
            'beginner' => 0,
            'intermediate' => 1,
            'advanced' => 2,
        ]);

        // Get minimum level required by complexity
        $complexityMinLevel = config('recommender.complexity_min_level', [
            'low' => 'beginner',
            'medium' => 'intermediate',
            'high' => 'advanced',
        ]);

        $complexityMin = $complexityMinLevel[$complexity] ?? 'beginner';

        // Return the higher of the two levels
        $reqOrder = $levelOrder[$requiredLevel] ?? 0;
        $compMinOrder = $levelOrder[$complexityMin] ?? 0;

        return $reqOrder >= $compMinOrder ? $requiredLevel : $complexityMin;
    }

    /**
     * Get the expected skill score for a given level.
     * 
     * This represents the ideal candidate's average score
     * that a project at this level expects.
     *
     * @param string $level The skill level
     * @return float Expected skill score (0.0-1.0)
     */
    public static function expectedSkill(string $level): float
    {
        $map = config('recommender.expected_skill_by_level', [
            'beginner' => 0.55,
            'intermediate' => 0.75,
            'advanced' => 0.90,
        ]);

        return (float) ($map[$level] ?? 0.55);
    }
}
