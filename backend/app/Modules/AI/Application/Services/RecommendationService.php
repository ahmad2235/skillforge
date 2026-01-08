<?php

namespace App\Modules\AI\Application\Services;

use App\Models\User;
use App\Modules\Projects\Infrastructure\Models\Project;
use App\Modules\AI\Application\Services\Recommender\CosineRecommenderEngine;
use App\Modules\AI\Application\Services\Recommender\Rules;
use Illuminate\Support\Collection;
use App\Modules\AI\Application\Services\AiLogger;

/**
 * Recommendation Service
 * 
 * Provides intelligent student-project matching using cosine similarity.
 * 
 * Features:
 * - Content-based filtering using domain, level, and activity features
 * - Cosine similarity scoring for candidate ranking
 * - Configurable semi-active student threshold
 * - Comprehensive logging for analytics
 * 
 * Business Rules Applied:
 * 1. Students must match project domain
 * 2. Students must match adjusted required level (considers complexity)
 * 3. Low-activity students are excluded
 * 4. Semi-active students need minimum similarity score
 * 5. Returns top N candidates sorted by similarity
 */
class RecommendationService
{
    private CosineRecommenderEngine $engine;

    public function __construct(
        private readonly AiLogger $aiLogger
    ) {
        $this->engine = new CosineRecommenderEngine();
    }

    /**
     * Rank candidate students for a given project using cosine similarity.
     *
     * @param Project $project The project to find candidates for
     * @param Collection $candidates Collection<User> of potential candidates
     * @param int|null $topN Maximum candidates to return (default from config)
     * @param float|null $semiActiveMinSimilarity Minimum similarity for semi-active students
     * @return array List of ['student' => User, 'score' => int, 'reason' => string]
     */
    public function rankCandidates(
        Project $project,
        Collection $candidates,
        ?int $topN = null,
        ?float $semiActiveMinSimilarity = null
    ): array {
        // Use config defaults if not specified
        $topN = $topN ?? config('recommender.top_n_default', 7);
        $semiActiveMinSimilarity = $semiActiveMinSimilarity 
            ?? config('recommender.semi_active_min_similarity_default', 0.80);

        // Run cosine similarity recommendation
        $recommendations = $this->engine->recommend(
            $project,
            $candidates,
            $topN,
            $semiActiveMinSimilarity
        );

        // Transform to expected output format (maintaining backward compatibility)
        $ranked = array_map(function ($item) use ($project) {
            // Convert similarity (0-1) to score (0-100) for consistency
            $score = (int) round($item['similarity'] * 100);

            return [
                'student' => $item['student'],
                'score' => $score,
                'reason' => $this->generateReason($item, $project),
            ];
        }, $recommendations);

        // Log the recommendation for analytics
        $this->aiLogger->log(
            'recommendation.rank',
            $project->owner_id,
            [
                'project_id' => $project->id,
                'candidate_ids' => $candidates->pluck('id')->all(),
                'top_n' => $topN,
                'semi_active_threshold' => $semiActiveMinSimilarity,
                'adjusted_level' => Rules::adjustedRequiredLevel([
                    'required_level' => $project->required_level,
                    'complexity' => $project->complexity ?? 'low',
                ]),
            ],
            [
                'top_candidates' => array_map(fn ($item) => [
                    'student_id' => $item['student']->id,
                    'score' => $item['score'],
                    'similarity' => $recommendations[array_search($item, $ranked)]['similarity'] ?? 0,
                ], $ranked),
            ]
        );

        return $ranked;
    }

    /**
     * Build small recommended teams that cover domain needs (esp. for fullstack projects).
     * Returns an array of teams with members and a composite score.
     *
     * @param Project $project
     * @param array $rankedCandidates Output of rankCandidates (student, score, reason)
     * @return array
     */
    public function buildTeams(Project $project, array $rankedCandidates): array
    {
        // Partition candidates by domain for quick pairing
        $byDomain = [
            'frontend' => [],
            'backend' => [],
            'fullstack' => [],
        ];

        foreach ($rankedCandidates as $item) {
            $domain = $item['student']->domain ?? 'backend';
            if (!isset($byDomain[$domain])) {
                $byDomain[$domain] = [];
            }
            $byDomain[$domain][] = $item;
        }

        $projectDomain = $project->domain ?? 'backend';

        // Helper to compute team score (avg of member scores)
        $makeTeam = function (array $members, string $coverage) {
            $score = (int) round(collect($members)->avg(fn ($m) => $m['score'] ?? 0));
            return [
                'team_score' => $score,
                'coverage' => $coverage,
                'members' => array_map(function ($m) {
                    /** @var \App\Models\User $student */
                    $student = $m['student'];
                    return [
                        'id' => $student->id,
                        'name' => $student->name,
                        'email' => $student->email,
                        'domain' => $student->domain,
                        'level' => $student->level,
                        'score' => $m['score'],
                        'reason' => $m['reason'],
                    ];
                }, $members),
            ];
        };

        $teams = [];

        // Team strategies by project domain
        if ($projectDomain === 'fullstack') {
            // Prefer pairing frontend + backend
            if (!empty($byDomain['frontend']) && !empty($byDomain['backend'])) {
                $teams[] = $makeTeam([
                    $byDomain['frontend'][0],
                    $byDomain['backend'][0],
                ], 'frontend+backend');
            }

            // Fullstack + frontend
            if (!empty($byDomain['fullstack']) && !empty($byDomain['frontend'])) {
                $teams[] = $makeTeam([
                    $byDomain['fullstack'][0],
                    $byDomain['frontend'][0],
                ], 'fullstack+frontend');
            }

            // Fullstack + backend
            if (!empty($byDomain['fullstack']) && !empty($byDomain['backend'])) {
                $teams[] = $makeTeam([
                    $byDomain['fullstack'][0],
                    $byDomain['backend'][0],
                ], 'fullstack+backend');
            }

            // Fullstack solo (if strong)
            if (!empty($byDomain['fullstack'])) {
                $teams[] = $makeTeam([
                    $byDomain['fullstack'][0],
                ], 'fullstack-solo');
            }

            // Optionally 3-person: frontend + backend + fullstack
            if (!empty($byDomain['frontend']) && !empty($byDomain['backend']) && !empty($byDomain['fullstack'])) {
                $teams[] = $makeTeam([
                    $byDomain['frontend'][0],
                    $byDomain['backend'][0],
                    $byDomain['fullstack'][0],
                ], 'frontend+backend+fullstack');
            }
        } else {
            // Backend-only or Frontend-only: allow fullstack as filler
            $primary = $projectDomain;
            $pool = array_merge($byDomain[$primary] ?? [], $byDomain['fullstack'] ?? []);

            if (!empty($pool)) {
                // Top solo
                $teams[] = $makeTeam([$pool[0]], $primary . '-solo');

                // Top duo if available
                if (count($pool) >= 2) {
                    $teams[] = $makeTeam([$pool[0], $pool[1]], $primary . '-pair');
                }
            }
        }

        // Deduplicate by member sets and sort by team_score desc
        $teams = collect($teams)
            ->unique(function ($team) {
                $ids = collect($team['members'])->pluck('id')->sort()->implode('-');
                return $ids . '|' . $team['coverage'];
            })
            ->sortByDesc('team_score')
            ->values()
            ->take(5) // limit to top 5 teams
            ->all();

        return $teams;
    }

    /**
     * Get raw recommendation data with full details.
     * 
     * This method returns more detailed information than rankCandidates,
     * useful for debugging or advanced UI features.
     *
     * @param Project $project
     * @param Collection $candidates
     * @param int|null $topN
     * @param float|null $semiActiveMinSimilarity
     * @return array Full recommendation data including similarity scores
     */
    public function getDetailedRecommendations(
        Project $project,
        Collection $candidates,
        ?int $topN = null,
        ?float $semiActiveMinSimilarity = null
    ): array {
        $topN = $topN ?? config('recommender.top_n_default', 7);
        $semiActiveMinSimilarity = $semiActiveMinSimilarity 
            ?? config('recommender.semi_active_min_similarity_default', 0.80);

        $recommendations = $this->engine->recommend(
            $project,
            $candidates,
            $topN,
            $semiActiveMinSimilarity
        );

        return [
            'project_id' => $project->id,
            'top_n' => $topN,
            'semi_active_min_similarity' => $semiActiveMinSimilarity,
            'adjusted_level' => Rules::adjustedRequiredLevel([
                'required_level' => $project->required_level,
                'complexity' => $project->complexity ?? 'low',
            ]),
            'candidates' => array_map(function ($item) {
                return [
                    'student_id' => $item['student_id'],
                    'name' => $item['name'],
                    'email' => $item['email'],
                    'domain' => $item['domain'],
                    'level' => $item['level'],
                    'activity_profile' => $item['activity_profile'],
                    'similarity' => $item['similarity'],
                ];
            }, $recommendations),
        ];
    }

    /**
     * Generate a human-readable reason for the recommendation.
     *
     * @param array $item Recommendation item with similarity data
     * @param Project $project The project
     * @return string Explanation string
     */
    private function generateReason(array $item, Project $project): string
    {
        $similarity = $item['similarity'] ?? 0;
        $activity = $item['activity_profile'] ?? 'unknown';

        $strength = match (true) {
            $similarity >= 0.90 => 'excellent',
            $similarity >= 0.80 => 'strong',
            $similarity >= 0.70 => 'good',
            default => 'moderate',
        };

        $activityNote = $activity === 'active' 
            ? 'Active engagement' 
            : 'Semi-active engagement';

        return sprintf(
            '%s match (%.0f%% similarity). %s. Domain: %s, Level: %s.',
            ucfirst($strength),
            $similarity * 100,
            $activityNote,
            $item['domain'] ?? 'N/A',
            $item['level'] ?? 'N/A'
        );
    }
}
