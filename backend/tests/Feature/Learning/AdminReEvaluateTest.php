<?php

namespace Tests\Feature\Learning;

use App\Jobs\EvaluateSubmissionJob;
use App\Modules\Learning\Infrastructure\Models\Submission;
use App\Modules\Learning\Infrastructure\Models\Task;
use App\Modules\Learning\Infrastructure\Models\RoadmapBlock;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class AdminReEvaluateTest extends TestCase
{
    use RefreshDatabase;

    public function test_student_is_forbidden_from_re_evaluate(): void
    {
        $student = User::factory()->create(['role' => 'student']);
        $block = RoadmapBlock::factory()->create([ 'level' => 'beginner', 'domain' => 'frontend', 'order_index' => 1 ]);
        $task = Task::factory()->create(['roadmap_block_id' => $block->id]);

        $submission = Submission::create([
            'user_id' => $student->id,
            'task_id' => $task->id,
            'answer_text' => 'answer',
            'status' => 'needs_manual_review',
        ]);

        $this->actingAs($student, 'sanctum')
            ->postJson("/api/admin/learning/submissions/{$submission->id}/re-evaluate")
            ->assertStatus(403);
    }

    public function test_admin_can_queue_re_evaluation_job(): void
    {
        Queue::fake();

        $admin = User::factory()->create(['role' => 'admin']);
        $student = User::factory()->create(['role' => 'student']);
        $block = RoadmapBlock::factory()->create([ 'level' => 'beginner', 'domain' => 'frontend', 'order_index' => 1 ]);
        $task = Task::factory()->create(['roadmap_block_id' => $block->id]);

        $submission = Submission::create([
            'user_id' => $student->id,
            'task_id' => $task->id,
            'answer_text' => 'answer',
            'status' => 'needs_manual_review',
        ]);

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/learning/submissions/{$submission->id}/re-evaluate")
            ->assertStatus(200)
            ->assertJsonPath('submission_id', $submission->id);

        Queue::assertPushed(EvaluateSubmissionJob::class, 1);
    }
}
