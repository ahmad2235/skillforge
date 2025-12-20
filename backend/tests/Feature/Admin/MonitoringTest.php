<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use App\Modules\AI\Infrastructure\Models\AiLog;
use App\Modules\Assessment\Infrastructure\Models\PlacementResult;
use App\Modules\Learning\Infrastructure\Models\RoadmapBlock;
use App\Modules\Learning\Infrastructure\Models\Task;
use App\Modules\Learning\Infrastructure\Models\Submission;
use App\Modules\Projects\Infrastructure\Models\Project;
use App\Modules\Projects\Infrastructure\Models\ProjectAssignment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MonitoringTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_view_monitoring_overview(): void
    {
        $admin = User::factory()->admin()->create();
        $student = User::factory()->student()->create([
            'level' => 'beginner',
            'domain' => 'frontend',
        ]);
        $owner = User::factory()->business()->create();

        $block = RoadmapBlock::factory()->create([
            'level' => 'beginner',
            'domain' => 'frontend',
            'order_index' => 1,
        ]);

        $task = Task::factory()->create([
            'roadmap_block_id' => $block->id,
        ]);

        Submission::create([
            'user_id' => $student->id,
            'task_id' => $task->id,
            'answer_text' => 'Submission',
            'status' => 'submitted',
            'submitted_at' => now(),
        ]);

        $project = Project::factory()->create([
            'owner_id' => $owner->id,
            'domain' => 'frontend',
            'required_level' => 'beginner',
        ]);

        ProjectAssignment::create([
            'project_id' => $project->id,
            'user_id' => $student->id,
            'status' => 'invited',
        ]);

        PlacementResult::create([
            'user_id' => $student->id,
            'final_level' => 'beginner',
            'final_domain' => 'frontend',
            'overall_score' => 0,
            'details' => null,
            'is_active' => true,
        ]);

        AiLog::create([
            'user_id' => $student->id,
            'type' => 'placement',
            'prompt' => 'Evaluate placement',
            'response' => 'OK',
            'model' => 'gpt-test',
            'status' => 'success',
        ]);

        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/admin/monitoring/overview');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'users' => ['total', 'students', 'business', 'admins'],
                    'learning' => ['blocks', 'tasks', 'submissions'],
                    'projects' => ['total', 'assignments'],
                    'assessments' => ['placement_results'],
                    'ai' => ['total_logs'],
                ],
            ])
            ->assertJsonPath('data.users.total', 2);
    }
}
