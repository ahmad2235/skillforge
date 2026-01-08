<?php

namespace Tests\Feature\AI;

use App\Models\User;
use App\Modules\Projects\Infrastructure\Models\Project;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Feature tests for the Recommendation system API
 */
class RecommendationTest extends TestCase
{
    use RefreshDatabase;

    private User $businessOwner;
    private Project $project;

    protected function setUp(): void
    {
        parent::setUp();

        // Create a business owner
        $this->businessOwner = User::factory()->create([
            'role' => 'business',
            'email_verified_at' => now(),
        ]);

        // Create a project
        $this->project = Project::create([
            'owner_id' => $this->businessOwner->id,
            'title' => 'Test Backend Project',
            'description' => 'A test project for recommendations',
            'domain' => 'backend',
            'required_level' => 'intermediate',
            'complexity' => 'medium',
            'status' => 'open',
        ]);
    }

    /**
     * Test candidates endpoint returns JSON response
     */
    public function test_candidates_endpoint_returns_json(): void
    {
        $this->actingAs($this->businessOwner);

        $response = $this->getJson("/api/business/projects/{$this->project->id}/candidates");

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'data' => [
                '*' => [
                    'student' => ['id', 'name', 'email', 'level', 'domain'],
                    'score',
                    'reason',
                ],
            ],
        ]);
    }

    /**
     * Test candidates endpoint requires authentication
     */
    public function test_candidates_endpoint_requires_auth(): void
    {
        $response = $this->getJson("/api/business/projects/{$this->project->id}/candidates");

        $response->assertStatus(401);
    }

    /**
     * Test candidates endpoint returns matching students
     */
    public function test_candidates_returns_matching_students(): void
    {
        // Create matching student
        $matchingStudent = User::factory()->create([
            'role' => 'student',
            'domain' => 'backend',
            'level' => 'intermediate',
            'is_active' => true,
            'email_verified_at' => now(),
        ]);

        // Create non-matching student (wrong domain)
        User::factory()->create([
            'role' => 'student',
            'domain' => 'frontend',
            'level' => 'intermediate',
            'is_active' => true,
            'email_verified_at' => now(),
        ]);

        $this->actingAs($this->businessOwner);

        $response = $this->getJson("/api/business/projects/{$this->project->id}/candidates");

        $response->assertStatus(200);
        
        $data = $response->json('data');
        
        // Should only include backend students
        foreach ($data as $candidate) {
            $this->assertEquals('backend', $candidate['student']['domain']);
        }
    }

    /**
     * Test project owner can only see their own project candidates
     */
    public function test_owner_cannot_see_other_projects_candidates(): void
    {
        // Create another business owner
        $otherOwner = User::factory()->create([
            'role' => 'business',
            'email_verified_at' => now(),
        ]);

        // Create project owned by other owner
        $otherProject = Project::create([
            'owner_id' => $otherOwner->id,
            'title' => 'Other Project',
            'description' => 'Not yours',
            'domain' => 'backend',
            'status' => 'open',
        ]);

        $this->actingAs($this->businessOwner);

        $response = $this->getJson("/api/business/projects/{$otherProject->id}/candidates");

        $response->assertStatus(403);
    }

    /**
     * Test student role cannot access candidates endpoint
     */
    public function test_student_cannot_access_candidates(): void
    {
        $student = User::factory()->create([
            'role' => 'student',
            'email_verified_at' => now(),
        ]);

        $this->actingAs($student);

        $response = $this->getJson("/api/business/projects/{$this->project->id}/candidates");

        $response->assertStatus(403);
    }

    /**
     * Test candidates respect complexity-adjusted level
     */
    public function test_candidates_respect_adjusted_level(): void
    {
        // Create high complexity project (upgrades to advanced)
        $highComplexityProject = Project::create([
            'owner_id' => $this->businessOwner->id,
            'title' => 'High Complexity Project',
            'description' => 'Very complex',
            'domain' => 'backend',
            'required_level' => 'beginner', // Will be upgraded to advanced
            'complexity' => 'high',
            'status' => 'open',
        ]);

        // Create advanced student
        User::factory()->create([
            'role' => 'student',
            'domain' => 'backend',
            'level' => 'advanced',
            'is_active' => true,
            'email_verified_at' => now(),
        ]);

        // Create beginner student (should NOT match)
        User::factory()->create([
            'role' => 'student',
            'domain' => 'backend',
            'level' => 'beginner',
            'is_active' => true,
            'email_verified_at' => now(),
        ]);

        $this->actingAs($this->businessOwner);

        $response = $this->getJson("/api/business/projects/{$highComplexityProject->id}/candidates");

        $response->assertStatus(200);
        
        $data = $response->json('data');
        
        // Only advanced students should match
        foreach ($data as $candidate) {
            $this->assertEquals('advanced', $candidate['student']['level']);
        }
    }
}
