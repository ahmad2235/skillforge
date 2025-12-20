<?php

namespace Tests\Feature\Projects;

use App\Models\User;
use App\Modules\Projects\Infrastructure\Models\Project;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminProjectsTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_list_projects(): void
    {
        $admin = User::factory()->admin()->create();
        Project::factory()->count(2)->create(['status' => 'open']);

        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/admin/projects?status=open');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data',
                'links',
                'meta',
            ])
            ->assertJsonFragment(['status' => 'open']);
    }

    public function test_admin_can_update_project_status(): void
    {
        $admin = User::factory()->admin()->create();
        $project = Project::factory()->create(['status' => 'open']);

        Sanctum::actingAs($admin);

        $response = $this->putJson("/api/admin/projects/{$project->id}", [
            'status' => 'cancelled',
            'admin_note' => 'Flagged for demo',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'cancelled')
            ->assertJsonPath('data.admin_note', 'Flagged for demo');

        $this->assertDatabaseHas('projects', [
            'id' => $project->id,
            'status' => 'cancelled',
            'admin_note' => 'Flagged for demo',
        ]);
    }

    public function test_non_admin_cannot_access_admin_project_endpoints(): void
    {
        $student = User::factory()->student()->create();
        $project = Project::factory()->create();

        Sanctum::actingAs($student);

        $this->getJson('/api/admin/projects')->assertStatus(403);
        $this->putJson("/api/admin/projects/{$project->id}", ['status' => 'draft'])->assertStatus(403);
    }
}
