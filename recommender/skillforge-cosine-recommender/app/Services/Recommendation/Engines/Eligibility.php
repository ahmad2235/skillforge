<?php

namespace App\Services\Recommendation\Engines;

class Eligibility
{
    public static function eligible(array $student, array $project): bool
    {
        if (($project['status'] ?? null) !== 'open') {
            return false;
        }

        if (($student['domain'] ?? null) !== ($project['domain'] ?? null)) {
            return false;
        }

        $activity = $student['activity_profile'] ?? 'low-activity';
        if ($activity === 'low-activity') {
            return false;
        }

        // No higher-level students taking low-level projects:
        // student level must equal adjusted required level
        $needed = Rules::adjustedRequiredLevel($project);
        if (($student['level'] ?? null) !== $needed) {
            return false;
        }

        return true;
    }
}
