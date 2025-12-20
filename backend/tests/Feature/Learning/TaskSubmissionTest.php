<?php

namespace Tests\Feature\Learning;

use App\Jobs\EvaluateSubmissionJob;
use App\Models\User;
use App\Modules\Learning\Infrastructure\Models\RoadmapBlock;
use App\Modules\Learning\Infrastructure\Models\Task;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TaskSubmissionTest extends TestCase
{
    use RefreshDatabase;

    public function test_student_can_submit_task(): void
    {
        Queue::fake();

        $student = User::factory()->student()->create([
            'level' => 'beginner',
            'domain' => 'frontend',
        ]);

        $block = RoadmapBlock::factory()->create([
            'level' => 'beginner',
            'domain' => 'frontend',
            'order_index' => 1,
        ]);

        $task = Task::factory()->create([
            'roadmap_block_id' => $block->id,
        ]);

        Sanctum::actingAs($student);

        $response = $this->postJson("/api/student/tasks/{$task->id}/submit", [
            'answer_text' => 'My solution',
        ]);

        $response->assertStatus(201)
            ->assertJsonFragment(['message' => 'Task submitted successfully.']);

        $this->assertDatabaseHas('submissions', [
            'user_id' => $student->id,
            'task_id' => $task->id,
            'answer_text' => 'My solution',
        ]);

        Queue::assertPushed(EvaluateSubmissionJob::class);
    }
}
