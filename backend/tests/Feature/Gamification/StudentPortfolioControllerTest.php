<?php

namespace Tests\Feature\Gamification;

use App\Models\User;
use App\Modules\Gamification\Infrastructure\Models\Portfolio;
use App\Modules\Projects\Infrastructure\Models\Project;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StudentPortfolioControllerTest extends TestCase
{
    use RefreshDatabase;

    private User $student;
    private User $businessOwner;
    private Project $project;

    protected function setUp(): void
    {
        parent::setUp();

        // Create test users
        $this->student = User::factory()->create(['role' => 'student']);
        $this->businessOwner = User::factory()->create(['role' => 'business']);

        // Create a project
        $this->project = Project::factory()->create([
            'owner_id' => $this->businessOwner->id,
            'title' => 'Test Project',
            'description' => 'A test project for portfolio',
        ]);
    }

    public function test_student_can_list_their_portfolio_items(): void
    {
        // Create portfolio items for the student
        Portfolio::factory()->count(3)->create(['user_id' => $this->student->id]);

        $response = $this->actingAs($this->student)->getJson('/api/student/portfolios');

        $response->assertStatus(200);
        $response->assertJsonCount(3, 'data');
    }

    public function test_student_can_create_ad_hoc_portfolio_item(): void
    {
        $response = $this->actingAs($this->student)->postJson('/api/student/portfolios', [
            'title' => 'My Awesome Project',
            'description' => 'A portfolio project',
            'github_url' => 'https://github.com/test/project',
            'live_demo_url' => 'https://demo.example.com',
            'score' => 85.5,
            'feedback' => 'Great work!',
            'category' => 'Web Development',
            'tags' => ['React', 'Node.js'],
            'is_public' => true,
        ]);

        $response->assertStatus(201);
        $response->assertJsonPath('portfolio.title', 'My Awesome Project');
        $response->assertJsonPath('portfolio.score', 85.5);

        $this->assertDatabaseHas('portfolios', [
            'user_id' => $this->student->id,
            'title' => 'My Awesome Project',
        ]);
    }

    public function test_student_can_update_portfolio_item(): void
    {
        $portfolio = Portfolio::factory()->create(['user_id' => $this->student->id]);

        $response = $this->actingAs($this->student)->putJson(
            "/api/student/portfolios/{$portfolio->id}",
            [
                'title' => 'Updated Title',
                'description' => 'Updated description',
                'score' => 90.0,
            ]
        );

        $response->assertStatus(200);
        $response->assertJsonPath('portfolio.title', 'Updated Title');
        $response->assertJsonPath('portfolio.score', 90.0);
    }

    public function test_student_can_delete_portfolio_item(): void
    {
        $portfolio = Portfolio::factory()->create(['user_id' => $this->student->id]);

        $response = $this->actingAs($this->student)->deleteJson(
            "/api/student/portfolios/{$portfolio->id}"
        );

        $response->assertStatus(200);

        $this->assertDatabaseMissing('portfolios', [
            'id' => $portfolio->id,
            'deleted_at' => null,
        ]);
    }

    public function test_student_can_toggle_portfolio_visibility(): void
    {
        $portfolio = Portfolio::factory()->create([
            'user_id' => $this->student->id,
            'is_public' => true,
        ]);

        $response = $this->actingAs($this->student)->patchJson(
            "/api/student/portfolios/{$portfolio->id}/visibility"
        );

        $response->assertStatus(200);
        $response->assertJsonPath('portfolio.is_public', false);
    }

    public function test_student_cannot_update_others_portfolio(): void
    {
        $anotherStudent = User::factory()->create(['role' => 'student']);
        $portfolio = Portfolio::factory()->create(['user_id' => $anotherStudent->id]);

        $response = $this->actingAs($this->student)->putJson(
            "/api/student/portfolios/{$portfolio->id}",
            ['title' => 'Hacked!']
        );

        $response->assertStatus(403);
    }

    public function test_student_cannot_delete_others_portfolio(): void
    {
        $anotherStudent = User::factory()->create(['role' => 'student']);
        $portfolio = Portfolio::factory()->create(['user_id' => $anotherStudent->id]);

        $response = $this->actingAs($this->student)->deleteJson(
            "/api/student/portfolios/{$portfolio->id}"
        );

        $response->assertStatus(403);
    }

    public function test_admin_can_view_any_portfolio(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $portfolio = Portfolio::factory()->create(['user_id' => $this->student->id]);

        $response = $this->actingAs($admin)->getJson("/api/student/portfolios/{$portfolio->id}");

        $response->assertStatus(200);
        $response->assertJsonPath('data.id', $portfolio->id);
    }

    public function test_portfolio_validates_url_fields(): void
    {
        $response = $this->actingAs($this->student)->postJson('/api/student/portfolios', [
            'title' => 'My Project',
            'github_url' => 'not-a-valid-url',
            'live_demo_url' => 'also-invalid',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['github_url', 'live_demo_url']);
    }

    public function test_portfolio_validates_score_range(): void
    {
        $response = $this->actingAs($this->student)->postJson('/api/student/portfolios', [
            'title' => 'My Project',
            'score' => 150, // Invalid: > 100
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['score']);
    }
}
