<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use App\Models\User;
use App\Modules\Projects\Infrastructure\Models\Project;
use App\Modules\Projects\Infrastructure\Models\ProjectAssignment;
use App\Modules\Projects\Infrastructure\Models\ProjectMilestone;
use App\Modules\Projects\Infrastructure\Models\ProjectMilestoneSubmission;
use App\Modules\Gamification\Infrastructure\Models\Portfolio;
use Carbon\Carbon;

/**
 * AiFlowSeeder - Comprehensive Seeder for AI Recommendation Analysis
 * 
 * This seeder generates:
 * - 20 students with varying activity levels (active, semi-active, low-activity)
 * - 20 businesses with projects of varying complexity
 * - Realistic project workflows with milestones and submissions
 * - AI evaluation scores with realistic distributions
 * - Exports comprehensive JSON for AI analysis
 * 
 * Run with: php artisan db:seed --class=AiFlowSeeder
 */
class AiFlowSeeder extends Seeder
{
    // Configuration constants
    private const STUDENT_COUNT = 20;
    private const BUSINESS_COUNT = 20;
    private const MILESTONES_PER_PROJECT = [2, 3, 4, 5]; // Random range

    // Student activity profiles
    private const ACTIVITY_PROFILES = [
        'active' => [
            'accept_rate' => 0.9,       // 90% chance to accept invitations
            'submission_rate' => 0.95,  // 95% of accepted get submissions
            'avg_score_range' => [75, 100],
            'weight' => 0.4,            // 40% of students
        ],
        'semi-active' => [
            'accept_rate' => 0.6,
            'submission_rate' => 0.7,
            'avg_score_range' => [55, 85],
            'weight' => 0.35,
        ],
        'low-activity' => [
            'accept_rate' => 0.3,
            'submission_rate' => 0.4,
            'avg_score_range' => [30, 65],
            'weight' => 0.25,
        ],
    ];

    // Domains and levels for realistic distribution
    private const DOMAINS = ['frontend', 'backend'];
    private const LEVELS = ['beginner', 'intermediate', 'advanced'];

    // Project titles for realistic data
    private const PROJECT_TITLES = [
        'frontend' => [
            'E-Commerce Dashboard UI',
            'Portfolio Website Redesign',
            'Mobile-First Landing Page',
            'React Component Library',
            'Social Media Dashboard',
            'Admin Panel Interface',
            'Blog Platform Frontend',
            'Weather App UI',
            'Task Management Dashboard',
            'Real-time Chat Interface',
        ],
        'backend' => [
            'REST API for E-Commerce',
            'Authentication Microservice',
            'Data Analytics Pipeline',
            'Payment Gateway Integration',
            'Notification Service',
            'File Storage System',
            'Search Engine Backend',
            'User Management API',
            'Inventory Management System',
            'Reporting Dashboard API',
        ],
    ];

    // Milestone templates per project complexity
    private const MILESTONE_TEMPLATES = [
        ['Planning & Requirements', 'Implementation', 'Testing & Delivery'],
        ['Research', 'Design', 'Development', 'Testing'],
        ['Discovery', 'Architecture', 'Core Development', 'Integration', 'Polish'],
    ];

    // Collected data for analysis
    private array $collectedData = [
        'students' => [],
        'businesses' => [],
        'projects' => [],
        'assignments' => [],
        'milestones' => [],
        'submissions' => [],
        'evaluations' => [],
    ];

    private array $analysisMetrics = [];

    /**
     * Run the seeder
     */
    public function run(): void
    {
        $this->command->info('🚀 Starting AiFlowSeeder...');
        $this->command->newLine();

        // Step 1: Create students with activity profiles
        $students = $this->createStudents();
        $this->command->info("✅ Created " . count($students) . " students");

        // Step 2: Create businesses with projects
        $businesses = $this->createBusinessesWithProjects();
        $this->command->info("✅ Created " . count($businesses) . " businesses with projects");

        // Step 3: Simulate realistic project workflows
        $this->simulateProjectWorkflows($students);
        $this->command->info("✅ Simulated project workflows");

        // Step 4: Generate AI evaluations for submissions
        $this->generateEvaluations();
        $this->command->info("✅ Generated AI evaluations");

        // Step 5: Mark completed projects
        $this->markCompletedProjects();
        $this->command->info("✅ Updated project statuses");

        // Step 6: Analyze data and generate insights
        $this->analyzeData();
        $this->command->info("✅ Analyzed data");

        // Step 7: Export to JSON
        $this->exportToJson();
        $this->command->info("✅ Exported to storage/ai_analysis.json");

        $this->command->newLine();
        $this->command->info('🎉 AiFlowSeeder completed successfully!');
        $this->printSummary();
    }

    /**
     * Create students with varying activity profiles
     */
    private function createStudents(): array
    {
        $students = [];
        
        foreach (self::ACTIVITY_PROFILES as $profileName => $profile) {
            $count = (int) round(self::STUDENT_COUNT * $profile['weight']);
            
            for ($i = 0; $i < $count; $i++) {
                $domain = $this->randomElement(self::DOMAINS);
                $level = $this->randomElement(self::LEVELS);
                
                $student = User::create([
                    'name' => $this->generateStudentName(),
                    'email' => 'student_' . Str::random(8) . '@skillforge.test',
                    'password' => Hash::make('password123'),
                    'role' => 'student',
                    'domain' => $domain,
                    'level' => $level,
                    'email_verified_at' => now(),
                ]);

                $studentData = [
                    'id' => $student->id,
                    'name' => $student->name,
                    'email' => $student->email,
                    'domain' => $domain,
                    'level' => $level,
                    'activity_profile' => $profileName,
                    'profile_settings' => $profile,
                ];

                $students[] = $studentData;
                $this->collectedData['students'][] = $studentData;
            }
        }

        return $students;
    }

    /**
     * Create businesses with projects and milestones
     */
    private function createBusinessesWithProjects(): array
    {
        $businesses = [];

        for ($i = 0; $i < self::BUSINESS_COUNT; $i++) {
            // Create business user
            $business = User::create([
                'name' => $this->generateCompanyName(),
                'email' => 'business_' . Str::random(8) . '@company.test',
                'password' => Hash::make('password123'),
                'role' => 'business',
                'email_verified_at' => now(),
            ]);

            $businessData = [
                'id' => $business->id,
                'name' => $business->name,
                'email' => $business->email,
                'projects' => [],
            ];

            // Create 1-3 projects per business
            $projectCount = rand(1, 3);
            
            for ($j = 0; $j < $projectCount; $j++) {
                $domain = $this->randomElement(self::DOMAINS);
                $level = $this->randomElement(self::LEVELS);
                $projectTitle = $this->getProjectTitle($domain);
                $complexity = rand(0, 2); // Index for milestone template

                $project = Project::create([
                    'owner_id' => $business->id,
                    'title' => $projectTitle,
                    'description' => $this->generateProjectDescription($projectTitle),
                    'domain' => $domain,
                    'required_level' => $level,
                    'min_score_required' => $this->generateMinScore($level),
                    'status' => 'open',
                    'estimated_duration_weeks' => rand(2, 8),
                    'metadata' => [
                        'complexity' => ['low', 'medium', 'high'][$complexity],
                        'created_by_seeder' => true,
                    ],
                ]);

                // Create milestones for the project
                $milestones = $this->createMilestones($project, $complexity);

                $projectData = [
                    'id' => $project->id,
                    'title' => $project->title,
                    'domain' => $domain,
                    'required_level' => $level,
                    'complexity' => ['low', 'medium', 'high'][$complexity],
                    'milestones_count' => count($milestones),
                    'status' => 'open',
                ];

                $businessData['projects'][] = $projectData;
                $this->collectedData['projects'][] = array_merge($projectData, [
                    'owner_id' => $business->id,
                    'milestone_ids' => array_column($milestones, 'id'),
                ]);
            }

            $businesses[] = $businessData;
            $this->collectedData['businesses'][] = $businessData;
        }

        return $businesses;
    }

    /**
     * Create milestones for a project based on complexity
     */
    private function createMilestones(Project $project, int $complexity): array
    {
        $template = self::MILESTONE_TEMPLATES[$complexity];
        $milestones = [];
        $baseDate = now()->addDays(rand(7, 14));

        foreach ($template as $index => $title) {
            $milestone = ProjectMilestone::create([
                'project_id' => $project->id,
                'title' => $title,
                'description' => $this->generateMilestoneDescription($title, $project->title),
                'order_index' => $index + 1,
                'due_date' => $baseDate->copy()->addWeeks($index + 1),
                'is_required' => true,
            ]);

            $milestoneData = [
                'id' => $milestone->id,
                'project_id' => $project->id,
                'title' => $title,
                'order_index' => $index + 1,
            ];

            $milestones[] = $milestoneData;
            $this->collectedData['milestones'][] = $milestoneData;
        }

        return $milestones;
    }

    /**
     * Simulate realistic project workflows
     */
    private function simulateProjectWorkflows(array $students): void
    {
        $projects = Project::with('milestones')->get();
        $studentUsers = collect($students)->keyBy('id');

        foreach ($projects as $project) {
            // Get matching students (same domain)
            $matchingStudents = collect($students)
                ->filter(fn($s) => $s['domain'] === $project->domain)
                ->shuffle()
                ->take(rand(2, 5)); // Invite 2-5 students per project

            foreach ($matchingStudents as $studentData) {
                $profile = $studentData['profile_settings'];
                $student = User::find($studentData['id']);

                // Check if student already has an active assignment
                $existingActive = ProjectAssignment::where('user_id', $student->id)
                    ->whereIn('status', ['pending', 'accepted'])
                    ->exists();

                // Determine assignment status based on activity profile
                $status = $this->determineAssignmentStatus($profile, $existingActive);
                
                $matchScore = $this->calculateMatchScore($student, $project);

                $assignment = ProjectAssignment::create([
                    'project_id' => $project->id,
                    'user_id' => $student->id,
                    'status' => $status,
                    'match_score' => $matchScore,
                    'assigned_at' => $status === 'accepted' ? now()->subDays(rand(1, 14)) : null,
                    'notes' => "Auto-generated by AiFlowSeeder",
                    'metadata' => [
                        'activity_profile' => $studentData['activity_profile'],
                        'auto_generated' => true,
                    ],
                ]);

                $assignmentData = [
                    'id' => $assignment->id,
                    'project_id' => $project->id,
                    'user_id' => $student->id,
                    'status' => $status,
                    'match_score' => $matchScore,
                    'activity_profile' => $studentData['activity_profile'],
                ];

                $this->collectedData['assignments'][] = $assignmentData;

                // If accepted, potentially create submissions
                if ($status === 'accepted' || $status === 'completed') {
                    $this->createSubmissionsForAssignment($assignment, $project, $profile);
                }
            }
        }
    }

    /**
     * Determine assignment status based on profile and rules
     */
    private function determineAssignmentStatus(array $profile, bool $hasActiveAssignment): string
    {
        // If student already has an active assignment, they can only be invited
        if ($hasActiveAssignment) {
            return 'pending';
        }

        // Random status based on accept rate
        if ($this->randomChance($profile['accept_rate'])) {
            // Further determine if completed or still in progress
            if ($this->randomChance(0.3)) {
                return 'completed';
            }
            return 'accepted';
        }

        // Might have declined
        if ($this->randomChance(0.3)) {
            return 'declined';
        }

        return 'pending';
    }

    /**
     * Create submissions for an accepted assignment
     */
    private function createSubmissionsForAssignment(
        ProjectAssignment $assignment, 
        Project $project, 
        array $profile
    ): void {
        $milestones = $project->milestones()->orderBy('order_index')->get();
        $submittedCount = 0;

        foreach ($milestones as $milestone) {
            // Based on submission rate, decide if this milestone has a submission
            if (!$this->randomChance($profile['submission_rate'])) {
                continue;
            }

            // Don't submit if previous milestone wasn't submitted (realistic flow)
            if ($submittedCount === 0 && $milestone->order_index > 1) {
                // Skip later milestones if first wasn't done
                if ($this->randomChance(0.5)) {
                    continue;
                }
            }

            $status = $this->determineSubmissionStatus($assignment->status);

            $submission = ProjectMilestoneSubmission::create([
                'project_assignment_id' => $assignment->id,
                'project_milestone_id' => $milestone->id,
                'user_id' => $assignment->user_id,
                'answer_text' => $this->generateSubmissionContent($milestone->title, $project->title),
                'attachment_url' => $this->randomChance(0.3) ? 'https://github.com/example/repo-' . rand(1000, 9999) : null,
                'status' => $status,
                'review_feedback' => $status === 'approved' ? $this->generateFeedback(true) : 
                                    ($status === 'rejected' ? $this->generateFeedback(false) : null),
                'reviewed_by' => in_array($status, ['approved', 'rejected']) ? $project->owner_id : null,
                'reviewed_at' => in_array($status, ['approved', 'rejected']) ? now()->subDays(rand(0, 7)) : null,
            ]);

            $submissionData = [
                'id' => $submission->id,
                'assignment_id' => $assignment->id,
                'milestone_id' => $milestone->id,
                'user_id' => $assignment->user_id,
                'status' => $status,
            ];

            $this->collectedData['submissions'][] = $submissionData;
            $submittedCount++;
        }
    }

    /**
     * Determine submission status based on assignment status
     */
    private function determineSubmissionStatus(string $assignmentStatus): string
    {
        if ($assignmentStatus === 'completed') {
            return 'approved';
        }

        $rand = rand(1, 100);
        if ($rand <= 40) return 'approved';
        if ($rand <= 60) return 'submitted';
        if ($rand <= 75) return 'reviewed';
        if ($rand <= 85) return 'rejected';
        return 'submitted';
    }

    /**
     * Generate AI evaluations for all submissions
     */
    private function generateEvaluations(): void
    {
        $submissions = ProjectMilestoneSubmission::with(['assignment.user', 'milestone.project'])->get();

        foreach ($submissions as $submission) {
            $studentProfile = $this->getStudentProfile($submission->user_id);
            $scoreRange = $studentProfile['profile_settings']['avg_score_range'] ?? [50, 80];

            // Generate realistic score with some variance
            $baseScore = rand($scoreRange[0], $scoreRange[1]);
            $variance = rand(-10, 10);
            $finalScore = max(0, min(100, $baseScore + $variance));

            // Simulate evaluation metadata
            $evaluation = [
                'submission_id' => $submission->id,
                'user_id' => $submission->user_id,
                'milestone_id' => $submission->project_milestone_id,
                'score' => $finalScore,
                'feedback' => $this->generateAiFeedback($finalScore),
                'criteria_scores' => [
                    'code_quality' => max(0, min(100, $finalScore + rand(-15, 15))),
                    'completeness' => max(0, min(100, $finalScore + rand(-10, 10))),
                    'documentation' => max(0, min(100, $finalScore + rand(-20, 20))),
                    'best_practices' => max(0, min(100, $finalScore + rand(-12, 12))),
                ],
                'evaluated_at' => now()->subDays(rand(0, 10))->toIso8601String(),
            ];

            $this->collectedData['evaluations'][] = $evaluation;
        }
    }

    /**
     * Mark projects as completed when all submissions are approved
     */
    private function markCompletedProjects(): void
    {
        $projects = Project::with(['assignments.milestoneSubmissions', 'milestones'])->get();

        foreach ($projects as $project) {
            $totalMilestones = $project->milestones->count();
            $completedAssignments = 0;

            foreach ($project->assignments as $assignment) {
                if ($assignment->status === 'completed') {
                    $completedAssignments++;
                    continue;
                }

                // Check if all milestones are approved
                $approvedSubmissions = $assignment->milestoneSubmissions
                    ->where('status', 'approved')
                    ->count();

                if ($approvedSubmissions >= $totalMilestones && $totalMilestones > 0) {
                    $assignment->update([
                        'status' => 'completed',
                        'completed_at' => now(),
                    ]);
                    $completedAssignments++;

                    // Update collected data
                    $this->updateAssignmentStatus($assignment->id, 'completed');
                }
            }

            // Mark project as completed if it has completed assignments
            if ($completedAssignments > 0 && $this->randomChance(0.4)) {
                $project->update(['status' => 'completed']);
                $this->updateProjectStatus($project->id, 'completed');
            }
        }
    }

    /**
     * Analyze collected data and generate insights
     */
    private function analyzeData(): void
    {
        // Student activity analysis
        $studentMetrics = $this->analyzeStudentActivity();
        
        // Project completion analysis
        $projectMetrics = $this->analyzeProjectCompletion();
        
        // Score distribution analysis
        $scoreMetrics = $this->analyzeScoreDistribution();
        
        // Pattern analysis for recommendations
        $patterns = $this->analyzePatterns();

        $this->analysisMetrics = [
            'generated_at' => now()->toIso8601String(),
            'summary' => [
                'total_students' => count($this->collectedData['students']),
                'total_businesses' => count($this->collectedData['businesses']),
                'total_projects' => count($this->collectedData['projects']),
                'total_assignments' => count($this->collectedData['assignments']),
                'total_submissions' => count($this->collectedData['submissions']),
                'total_evaluations' => count($this->collectedData['evaluations']),
            ],
            'student_metrics' => $studentMetrics,
            'project_metrics' => $projectMetrics,
            'score_metrics' => $scoreMetrics,
            'recommendation_patterns' => $patterns,
        ];
    }

    /**
     * Analyze student activity levels
     */
    private function analyzeStudentActivity(): array
    {
        $students = collect($this->collectedData['students']);
        $assignments = collect($this->collectedData['assignments']);
        $evaluations = collect($this->collectedData['evaluations']);

        $studentStats = [];
        
        foreach ($students as $student) {
            $studentAssignments = $assignments->where('user_id', $student['id']);
            $studentEvaluations = $evaluations->where('user_id', $student['id']);
            
            $acceptedCount = $studentAssignments->whereIn('status', ['accepted', 'completed'])->count();
            $completedCount = $studentAssignments->where('status', 'completed')->count();
            $avgScore = $studentEvaluations->avg('score') ?? 0;

            $studentStats[] = [
                'id' => $student['id'],
                'name' => $student['name'],
                'activity_profile' => $student['activity_profile'],
                'domain' => $student['domain'],
                'level' => $student['level'],
                'total_assignments' => $studentAssignments->count(),
                'accepted_assignments' => $acceptedCount,
                'completed_assignments' => $completedCount,
                'total_evaluations' => $studentEvaluations->count(),
                'average_score' => round($avgScore, 2),
                'engagement_score' => $this->calculateEngagementScore(
                    $studentAssignments->count(),
                    $acceptedCount,
                    $completedCount,
                    $avgScore
                ),
            ];
        }

        // Group by activity profile
        $byProfile = collect($studentStats)->groupBy('activity_profile')->map(function ($group) {
            return [
                'count' => $group->count(),
                'avg_engagement' => round($group->avg('engagement_score'), 2),
                'avg_score' => round($group->avg('average_score'), 2),
                'total_completed' => $group->sum('completed_assignments'),
            ];
        });

        return [
            'individual' => $studentStats,
            'by_activity_profile' => $byProfile->toArray(),
            'active_students' => collect($studentStats)
                ->where('engagement_score', '>=', 60)
                ->count(),
            'inactive_students' => collect($studentStats)
                ->where('engagement_score', '<', 30)
                ->count(),
        ];
    }

    /**
     * Analyze project completion rates
     */
    private function analyzeProjectCompletion(): array
    {
        $projects = collect($this->collectedData['projects']);
        $assignments = collect($this->collectedData['assignments']);
        $submissions = collect($this->collectedData['submissions']);

        $projectStats = [];

        foreach ($projects as $project) {
            $projectAssignments = $assignments->where('project_id', $project['id']);
            $completedAssignments = $projectAssignments->where('status', 'completed');
            
            // Get submission stats through assignment IDs
            $assignmentIds = $projectAssignments->pluck('id')->toArray();
            $projectSubmissions = $submissions->whereIn('assignment_id', $assignmentIds);
            $approvedSubmissions = $projectSubmissions->where('status', 'approved');

            $projectStats[] = [
                'id' => $project['id'],
                'title' => $project['title'],
                'domain' => $project['domain'],
                'complexity' => $project['complexity'] ?? 'medium',
                'total_assignments' => $projectAssignments->count(),
                'completed_assignments' => $completedAssignments->count(),
                'completion_rate' => $projectAssignments->count() > 0 
                    ? round(($completedAssignments->count() / $projectAssignments->count()) * 100, 2) 
                    : 0,
                'total_submissions' => $projectSubmissions->count(),
                'approved_submissions' => $approvedSubmissions->count(),
            ];
        }

        return [
            'individual' => $projectStats,
            'overall_completion_rate' => count($projectStats) > 0 
                ? round(collect($projectStats)->avg('completion_rate'), 2) 
                : 0,
            'by_complexity' => collect($projectStats)->groupBy('complexity')->map(function ($group) {
                return [
                    'count' => $group->count(),
                    'avg_completion_rate' => round($group->avg('completion_rate'), 2),
                ];
            })->toArray(),
            'by_domain' => collect($projectStats)->groupBy('domain')->map(function ($group) {
                return [
                    'count' => $group->count(),
                    'avg_completion_rate' => round($group->avg('completion_rate'), 2),
                ];
            })->toArray(),
        ];
    }

    /**
     * Analyze score distribution
     */
    private function analyzeScoreDistribution(): array
    {
        $evaluations = collect($this->collectedData['evaluations']);
        $scores = $evaluations->pluck('score');

        if ($scores->isEmpty()) {
            return [
                'overall' => [],
                'by_score_range' => [],
                'criteria_averages' => [],
            ];
        }

        // Score ranges
        $scoreRanges = [
            'excellent (90-100)' => $scores->filter(fn($s) => $s >= 90)->count(),
            'good (75-89)' => $scores->filter(fn($s) => $s >= 75 && $s < 90)->count(),
            'average (60-74)' => $scores->filter(fn($s) => $s >= 60 && $s < 75)->count(),
            'below_average (40-59)' => $scores->filter(fn($s) => $s >= 40 && $s < 60)->count(),
            'poor (0-39)' => $scores->filter(fn($s) => $s < 40)->count(),
        ];

        // Criteria averages
        $criteriaAverages = [
            'code_quality' => round($evaluations->avg('criteria_scores.code_quality') ?? 0, 2),
            'completeness' => round($evaluations->avg('criteria_scores.completeness') ?? 0, 2),
            'documentation' => round($evaluations->avg('criteria_scores.documentation') ?? 0, 2),
            'best_practices' => round($evaluations->avg('criteria_scores.best_practices') ?? 0, 2),
        ];

        return [
            'overall' => [
                'min' => $scores->min(),
                'max' => $scores->max(),
                'average' => round($scores->avg(), 2),
                'median' => round($scores->median(), 2),
                'std_deviation' => round($this->standardDeviation($scores->toArray()), 2),
            ],
            'by_score_range' => $scoreRanges,
            'criteria_averages' => $criteriaAverages,
        ];
    }

    /**
     * Analyze patterns for recommendation system
     */
    private function analyzePatterns(): array
    {
        $students = collect($this->collectedData['students']);
        $assignments = collect($this->collectedData['assignments']);
        $evaluations = collect($this->collectedData['evaluations']);

        // Success patterns by domain/level combination
        $domainLevelPatterns = [];
        
        foreach (self::DOMAINS as $domain) {
            foreach (self::LEVELS as $level) {
                $matchingStudents = $students
                    ->where('domain', $domain)
                    ->where('level', $level)
                    ->pluck('id');

                $matchingAssignments = $assignments->whereIn('user_id', $matchingStudents);
                $matchingEvaluations = $evaluations->whereIn('user_id', $matchingStudents);

                $domainLevelPatterns["{$domain}_{$level}"] = [
                    'student_count' => $matchingStudents->count(),
                    'avg_score' => round($matchingEvaluations->avg('score') ?? 0, 2),
                    'completion_rate' => $matchingAssignments->count() > 0
                        ? round(($matchingAssignments->where('status', 'completed')->count() / $matchingAssignments->count()) * 100, 2)
                        : 0,
                    'accept_rate' => $matchingAssignments->count() > 0
                        ? round(($matchingAssignments->whereIn('status', ['accepted', 'completed'])->count() / $matchingAssignments->count()) * 100, 2)
                        : 0,
                ];
            }
        }

        // Top performers for recommendations
        $topPerformers = $evaluations
            ->groupBy('user_id')
            ->map(function ($group, $userId) use ($students) {
                $student = $students->firstWhere('id', $userId);
                return [
                    'user_id' => $userId,
                    'name' => $student['name'] ?? 'Unknown',
                    'domain' => $student['domain'] ?? 'unknown',
                    'level' => $student['level'] ?? 'unknown',
                    'avg_score' => round($group->avg('score'), 2),
                    'evaluation_count' => $group->count(),
                ];
            })
            ->sortByDesc('avg_score')
            ->take(10)
            ->values()
            ->toArray();

        return [
            'domain_level_success_patterns' => $domainLevelPatterns,
            'top_performers' => $topPerformers,
            'recommendations_ready' => true,
            'data_quality_score' => $this->calculateDataQualityScore(),
        ];
    }

    /**
     * Export all data to JSON file
     */
    private function exportToJson(): void
    {
        $exportData = [
            'metadata' => [
                'generated_at' => now()->toIso8601String(),
                'generator' => 'AiFlowSeeder',
                'version' => '1.0.0',
                'purpose' => 'AI Recommendation System Training & Analysis',
            ],
            'entities' => $this->collectedData,
            'analysis' => $this->analysisMetrics,
            'schema_info' => [
                'students' => ['id', 'name', 'email', 'domain', 'level', 'activity_profile'],
                'businesses' => ['id', 'name', 'email', 'projects'],
                'projects' => ['id', 'title', 'domain', 'required_level', 'complexity', 'status'],
                'assignments' => ['id', 'project_id', 'user_id', 'status', 'match_score'],
                'submissions' => ['id', 'assignment_id', 'milestone_id', 'user_id', 'status'],
                'evaluations' => ['submission_id', 'user_id', 'score', 'criteria_scores'],
            ],
        ];

        // Ensure storage directory exists
        $path = storage_path('ai_analysis.json');
        file_put_contents($path, json_encode($exportData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }

    /**
     * Print summary to console
     */
    private function printSummary(): void
    {
        $this->command->newLine();
        $this->command->table(
            ['Metric', 'Value'],
            [
                ['Students Created', count($this->collectedData['students'])],
                ['Businesses Created', count($this->collectedData['businesses'])],
                ['Projects Created', count($this->collectedData['projects'])],
                ['Assignments Created', count($this->collectedData['assignments'])],
                ['Submissions Created', count($this->collectedData['submissions'])],
                ['Evaluations Generated', count($this->collectedData['evaluations'])],
                ['Output File', 'storage/ai_analysis.json'],
            ]
        );
    }

    // ============================================
    // HELPER METHODS
    // ============================================

    private function generateStudentName(): string
    {
        $firstNames = ['Ahmad', 'Sara', 'Omar', 'Layla', 'Yusuf', 'Nora', 'Hassan', 'Dina', 
                       'Karim', 'Fatima', 'Ali', 'Mona', 'Tariq', 'Rana', 'Walid', 'Hana',
                       'Zain', 'Maya', 'Sami', 'Jana'];
        $lastNames = ['Hassan', 'Ahmed', 'Ali', 'Mohamed', 'Ibrahim', 'Khalil', 'Nasser',
                      'Salem', 'Fawzi', 'Mansour', 'Rashid', 'Hamza', 'Yousef', 'Saleh'];
        
        return $this->randomElement($firstNames) . ' ' . $this->randomElement($lastNames);
    }

    private function generateCompanyName(): string
    {
        $prefixes = ['Tech', 'Digital', 'Smart', 'Innovative', 'Cloud', 'Data', 'Web', 'App'];
        $suffixes = ['Solutions', 'Systems', 'Labs', 'Hub', 'Works', 'Studio', 'Corp', 'Co'];
        
        return $this->randomElement($prefixes) . ' ' . $this->randomElement($suffixes);
    }

    private function getProjectTitle(string $domain): string
    {
        static $usedTitles = [];
        
        $titles = self::PROJECT_TITLES[$domain] ?? self::PROJECT_TITLES['frontend'];
        $available = array_diff($titles, $usedTitles);
        
        if (empty($available)) {
            $available = $titles; // Reset if all used
        }
        
        $title = $this->randomElement($available);
        $usedTitles[] = $title;
        
        // Add variant if duplicate
        if (in_array($title, $usedTitles)) {
            $title .= ' v' . rand(2, 5);
        }
        
        return $title;
    }

    private function generateProjectDescription(string $title): string
    {
        return "This project involves building {$title}. " .
               "The goal is to create a production-ready solution following best practices. " .
               "Expected deliverables include complete source code, documentation, and deployment guide.";
    }

    private function generateMilestoneDescription(string $milestoneTitle, string $projectTitle): string
    {
        return "Complete the {$milestoneTitle} phase for {$projectTitle}. " .
               "Deliverables should be submitted with clear documentation.";
    }

    private function generateMinScore(string $level): ?int
    {
        return match($level) {
            'beginner' => rand(40, 60),
            'intermediate' => rand(60, 75),
            'advanced' => rand(75, 90),
            default => null,
        };
    }

    private function calculateMatchScore(User $student, Project $project): float
    {
        $score = 50; // Base score
        
        // Domain match bonus
        if ($student->domain === $project->domain) {
            $score += 25;
        }
        
        // Level match bonus
        if ($student->level === $project->required_level) {
            $score += 20;
        }
        
        // Add some randomness
        $score += rand(-10, 10);
        
        return max(0, min(100, $score));
    }

    private function generateSubmissionContent(string $milestoneTitle, string $projectTitle): string
    {
        $templates = [
            "Completed the {$milestoneTitle} for {$projectTitle}. All requirements have been addressed.",
            "Submission for {$milestoneTitle}: Implementation is complete with unit tests included.",
            "{$milestoneTitle} deliverables ready. Code follows project guidelines and best practices.",
            "Final submission for {$milestoneTitle}. Documentation and source code attached.",
        ];
        
        return $this->randomElement($templates);
    }

    private function generateFeedback(bool $isPositive): string
    {
        if ($isPositive) {
            $templates = [
                "Excellent work! The implementation meets all requirements.",
                "Great job on this milestone. Code quality is impressive.",
                "Well done! The solution is clean and well-documented.",
                "Approved. Good attention to detail and best practices.",
            ];
        } else {
            $templates = [
                "Needs improvement. Please address the code review comments.",
                "The submission doesn't meet the requirements. See feedback for details.",
                "Please revise and resubmit with the requested changes.",
                "More work needed on documentation and error handling.",
            ];
        }
        
        return $this->randomElement($templates);
    }

    private function generateAiFeedback(int $score): string
    {
        if ($score >= 90) {
            return "Outstanding submission! Demonstrates excellent understanding and implementation skills.";
        } elseif ($score >= 75) {
            return "Good work with minor areas for improvement. Code quality is solid.";
        } elseif ($score >= 60) {
            return "Acceptable submission with room for improvement in code organization and documentation.";
        } elseif ($score >= 40) {
            return "Below expectations. Significant improvements needed in implementation approach.";
        } else {
            return "Submission requires major revisions. Consider reviewing the requirements.";
        }
    }

    private function getStudentProfile(int $userId): array
    {
        foreach ($this->collectedData['students'] as $student) {
            if ($student['id'] === $userId) {
                return $student;
            }
        }
        
        return [
            'profile_settings' => ['avg_score_range' => [50, 70]]
        ];
    }

    private function calculateEngagementScore(int $total, int $accepted, int $completed, float $avgScore): float
    {
        if ($total === 0) return 0;
        
        $acceptRate = ($accepted / $total) * 30;
        $completeRate = ($completed / max($accepted, 1)) * 40;
        $scoreBonus = ($avgScore / 100) * 30;
        
        return round($acceptRate + $completeRate + $scoreBonus, 2);
    }

    private function calculateDataQualityScore(): float
    {
        $factors = [
            'has_students' => count($this->collectedData['students']) >= 15 ? 1 : 0.5,
            'has_projects' => count($this->collectedData['projects']) >= 15 ? 1 : 0.5,
            'has_evaluations' => count($this->collectedData['evaluations']) >= 20 ? 1 : 0.5,
            'diversity' => 1, // Assume good diversity
        ];
        
        return round(array_sum($factors) / count($factors) * 100, 2);
    }

    private function updateAssignmentStatus(int $id, string $status): void
    {
        foreach ($this->collectedData['assignments'] as &$assignment) {
            if ($assignment['id'] === $id) {
                $assignment['status'] = $status;
                break;
            }
        }
    }

    private function updateProjectStatus(int $id, string $status): void
    {
        foreach ($this->collectedData['projects'] as &$project) {
            if ($project['id'] === $id) {
                $project['status'] = $status;
                break;
            }
        }
    }

    private function randomElement(array $array): mixed
    {
        return $array[array_rand($array)];
    }

    private function randomChance(float $probability): bool
    {
        return (mt_rand() / mt_getrandmax()) < $probability;
    }

    private function standardDeviation(array $values): float
    {
        if (count($values) === 0) return 0;
        
        $mean = array_sum($values) / count($values);
        $variance = 0;
        
        foreach ($values as $value) {
            $variance += pow($value - $mean, 2);
        }
        
        return sqrt($variance / count($values));
    }
}
