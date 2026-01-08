<?php

namespace App\Modules\AI\Application\Services\Recommender;

/**
 * Eligibility Checker for Student-Project Matching
 * 
 * Determines whether a student is eligible to be considered
 * as a candidate for a specific project based on business rules.
 * 
 * Eligibility Rules (ALL must pass):
 * 1. Project must have status = 'open'
 * 2. Student's domain must match project's domain
 * 3. Student's activity profile must NOT be 'low-activity'
 * 4. Student's level must EXACTLY match the project's adjusted required level
 *    (prevents over-qualified students from taking beginner projects)
 */
class Eligibility
{
    /**
     * Check if a student is eligible for a project.
     *
     * @param array $student Student data array with keys: domain, activity_profile, level
     * @param array $project Project data array with keys: status, domain, required_level, complexity
     * @return bool True if eligible, false otherwise
     */
    public static function eligible(array $student, array $project): bool
    {
        // Rule 1: Project must be open for applications
        if (($project['status'] ?? null) !== 'open') {
            return false;
        }

        // Rule 2: Domain matching - allow flexible matching for fullstack coverage
        $studentDomain = $student['domain'] ?? null;
        $projectDomain = $project['domain'] ?? null;

        $domainMatch = match ($projectDomain) {
            'fullstack' => in_array($studentDomain, ['frontend', 'backend', 'fullstack'], true),
            'backend' => in_array($studentDomain, ['backend', 'fullstack'], true),
            'frontend' => in_array($studentDomain, ['frontend', 'fullstack'], true),
            default => false,
        };

        if (!$domainMatch) {
            return false;
        }

        // Rule 3: Activity filter - exclude inactive students
        // Low-activity students are not eligible (they may not respond to invites)
        $activity = $student['activity_profile'] ?? 'low-activity';
        if ($activity === 'low-activity') {
            return false;
        }

        // Rule 4: Level matching - student must match the adjusted required level
        // This prevents advanced students from taking beginner projects
        // (ensures fair distribution and appropriate challenge level)
        $neededLevel = Rules::adjustedRequiredLevel($project);
        if (($student['level'] ?? null) !== $neededLevel) {
            return false;
        }

        return true;
    }

    /**
     * Get the reason why a student is not eligible (for debugging/logging).
     *
     * @param array $student Student data
     * @param array $project Project data
     * @return string|null Reason string, or null if eligible
     */
    public static function ineligibilityReason(array $student, array $project): ?string
    {
        if (($project['status'] ?? null) !== 'open') {
            return 'Project is not open for applications';
        }

        if (($student['domain'] ?? null) !== ($project['domain'] ?? null)) {
            return sprintf(
                'Domain mismatch: student=%s, project=%s',
                $student['domain'] ?? 'unknown',
                $project['domain'] ?? 'unknown'
            );
        }

        $activity = $student['activity_profile'] ?? 'low-activity';
        if ($activity === 'low-activity') {
            return 'Student has low-activity profile';
        }

        $neededLevel = Rules::adjustedRequiredLevel($project);
        if (($student['level'] ?? null) !== $neededLevel) {
            return sprintf(
                'Level mismatch: student=%s, required=%s',
                $student['level'] ?? 'unknown',
                $neededLevel
            );
        }

        return null;
    }
}
