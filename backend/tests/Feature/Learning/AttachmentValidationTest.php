<?php

namespace Tests\Feature\Learning;

use App\Models\User;
use App\Modules\Learning\Infrastructure\Models\RoadmapBlock;
use App\Modules\Learning\Infrastructure\Models\Task;
use App\Modules\Projects\Infrastructure\Models\Project;
use App\Modules\Projects\Infrastructure\Models\ProjectAssignment;
use App\Modules\Projects\Infrastructure\Models\ProjectMilestone;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AttachmentValidationTest extends TestCase
{
    use RefreshDatabase;

    public function test_task_submission_requires_https_attachment(): void
    {
        $student = User::factory()->student()->create();
        $block = RoadmapBlock::factory()->create();
        $task = Task::factory()->create(['roadmap_block_id' => $block->id]);

        Sanctum::actingAs($student);

        $this->postJson("/api/student/tasks/{$task->id}/submit", [
            'answer_text' => 'here',
            'attachment_url' => 'http://example.com/file.zip',
        ])->assertStatus(422);

        $this->postJson("/api/student/tasks/{$task->id}/submit", [
            'attachment_url' => 'https://example.com/file.zip',
        ])->assertStatus(201);
    }

    public function test_milestone_submission_requires_https_attachment(): void
    {
        $student = User::factory()->student()->create();
        $project = Project::factory()->create();
        $assignment = ProjectAssignment::factory()->create([
            'project_id' => $project->id,
            'user_id' => $student->id,
            'status' => 'accepted',
        ]);
        $milestone = ProjectMilestone::factory()->create(['project_id' => $project->id]);

        Sanctum::actingAs($student);

        $this->postJson(
            "/api/student/projects/assignments/{$assignment->id}/milestones/{$milestone->id}/submit",
            [
                'attachment_url' => 'http://example.com/file.zip',
            ]
        )->assertStatus(422);

        $this->postJson(
            "/api/student/projects/assignments/{$assignment->id}/milestones/{$milestone->id}/submit",
            [
                'attachment_url' => 'https://example.com/file.zip',
            ]
        )->assertStatus(201);
    }
}
