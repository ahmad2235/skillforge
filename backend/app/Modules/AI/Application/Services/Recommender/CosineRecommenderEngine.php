<?php

namespace App\Modules\AI\Application\Services\Recommender;

use App\Models\User;
use App\Modules\Projects\Infrastructure\Models\Project;
use Illuminate\Support\Collection;

/**
 * Cosine Similarity Recommender Engine
 * 
 * Main engine that orchestrates the recommendation process:
 * 1. Normalizes project and student data into standard format
 * 2. Filters students by eligibility rules
 * 3. Vectorizes remaining candidates
 * 4. Computes cosine similarity scores
 * 5. Applies semi-active threshold filter
 * 6. Returns top N candidates sorted by similarity
 * 
 * This implementation works directly with Laravel Eloquent models
 * and integrates seamlessly with the existing SkillForge architecture.
 */
class CosineRecommenderEngine
{
    /**
     * Recommend top candidates for a project.
     *
     * @param Project $project The project to find candidates for
     * @param Collection<User> $students Collection of potential student candidates
     * @param int $topN Maximum number of candidates to return
     * @param float $semiActiveMinSimilarity Minimum similarity for semi-active students
     * @return array List of candidate results with scores
     */
    public function recommend(
        Project $project,
        Collection $students,
        int $topN = 7,
        float $semiActiveMinSimilarity = 0.80
    ): array {
        // Normalize project data to standard array format
        $projectData = $this->normalizeProject($project);

        // Get domain vocabulary for one-hot encoding
        $domainVocab = config('recommender.domains', ['backend', 'frontend']);
        sort($domainVocab);

        // Create project vector (represents ideal candidate)
        $projectVector = Vectorizer::projectVector($projectData, $domainVocab);

        $results = [];

        foreach ($students as $student) {
            // Normalize student data
            $studentData = $this->normalizeStudent($student);

            // Check eligibility (skip ineligible students)
            if (!Eligibility::eligible($studentData, $projectData)) {
                continue;
            }

            // Create student vector
            $studentVector = Vectorizer::studentVector($studentData, $domainVocab);

            // Compute cosine similarity
            $similarity = Similarity::cosine($studentVector, $projectVector);

            // Apply semi-active threshold filter
            $activity = $studentData['activity_profile'] ?? 'low-activity';
            if ($activity === 'semi-active' && $similarity < $semiActiveMinSimilarity) {
                continue;
            }

            // Add to results
            $results[] = [
                'student' => $student,
                'student_id' => $student->id,
                'name' => $student->name,
                'email' => $student->email,
                'domain' => $studentData['domain'],
                'level' => $studentData['level'],
                'activity_profile' => $activity,
                'similarity' => round($similarity, 4),
            ];
        }

        // Sort by similarity descending, with tie-breaker for active > semi-active
        usort($results, function ($a, $b) {
            if ($a['similarity'] === $b['similarity']) {
                // Active students get priority in ties
                $aActive = ($a['activity_profile'] ?? '') === 'active' ? 1 : 0;
                $bActive = ($b['activity_profile'] ?? '') === 'active' ? 1 : 0;
                return $bActive <=> $aActive;
            }
            return $b['similarity'] <=> $a['similarity'];
        });

        // Return top N results
        return array_slice($results, 0, max(0, $topN));
    }

    /**
     * Normalize a Project model to standard array format.
     *
     * @param Project $project
     * @return array Normalized project data
     */
    private function normalizeProject(Project $project): array
    {
        return [
            'id' => $project->id,
            'status' => $project->status ?? 'draft',
            'domain' => $project->domain ?? 'backend',
            'required_level' => $project->required_level ?? 'beginner',
            'complexity' => $project->complexity ?? 'low',
        ];
    }

    /**
     * Normalize a User model to standard student array format.
     *
     * @param User $student
     * @return array Normalized student data
     */
    private function normalizeStudent(User $student): array
    {
        // Compute activity profile based on user's engagement metrics
        // This can be enhanced later with real activity data
        $activityProfile = $this->computeActivityProfile($student);

        // Build profile settings from available data
        // In production, this would come from a separate profile/stats table
        $profileSettings = $this->buildProfileSettings($student);

        return [
            'id' => $student->id,
            'name' => $student->name,
            'email' => $student->email,
            'domain' => $student->domain ?? 'backend',
            'level' => $student->level ?? 'beginner',
            'activity_profile' => $activityProfile,
            'profile_settings' => $profileSettings,
        ];
    }

    /**
     * Compute activity profile for a student.
     * 
     * This is a simplified version - in production, you would calculate
     * this based on login frequency, submission rate, response time, etc.
     *
     * @param User $student
     * @return string 'active', 'semi-active', or 'low-activity'
     */
    private function computeActivityProfile(User $student): string
    {
        // Check if student has is_active flag
        if (isset($student->is_active)) {
            if (!$student->is_active) {
                return 'low-activity';
            }
        }

        // Check last activity timestamp if available
        if (isset($student->last_active_at)) {
            $daysSinceActive = now()->diffInDays($student->last_active_at);
            
            if ($daysSinceActive > 30) {
                return 'low-activity';
            } elseif ($daysSinceActive > 7) {
                return 'semi-active';
            }
        }

        // Default to active for verified, active users
        return 'active';
    }

    /**
     * Build profile settings for vectorization.
     *
     * @param User $student
     * @return array Profile settings with avg_score_range and weight
     */
    private function buildProfileSettings(User $student): array
    {
        // Default values - in production, calculate from actual performance data
        // These would come from:
        // - Placement test scores
        // - Assignment completion scores
        // - Portfolio metrics
        
        return [
            // Default score range - should be calculated from actual submissions
            'avg_score_range' => [60, 85],
            // Default reliability weight - should be calculated from acceptance/completion rates
            'weight' => 0.5,
        ];
    }
}
