<?php

namespace Tests\Feature\Learning;

use App\Modules\Learning\Infrastructure\Models\Submission;
use App\Modules\Learning\Infrastructure\Models\Task;
use App\Modules\Learning\Infrastructure\Models\RoadmapBlock;
use App\Modules\Learning\Infrastructure\Models\AiEvaluation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminSubmissionReviewTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_review_and_override_submission(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $student = User::factory()->create(['role' => 'student']);

        $block = RoadmapBlock::factory()->create([ 'level' => 'beginner', 'domain' => 'frontend', 'order_index' => 1 ]);
        $task = Task::create([
            'roadmap_block_id' => $block->id,
            'title' => 'Review Task',
            'description' => 'Task with rubric',
            'type' => 'coding',
            'difficulty' => 2,
            'max_score' => 100,
            'rubric' => [
                ['criterion' => 'Structure', 'max_points' => 30],
                ['criterion' => 'Validation', 'max_points' => 40],
                ['criterion' => 'Styling', 'max_points' => 30],
            ],
            'weight' => 1,
        ]);

        $submission = Submission::create([
            'user_id' => $student->id,
            'task_id' => $task->id,
            'answer_text' => 'initial answer',
            'status' => 'evaluated',
            'evaluation_status' => Submission::EVAL_COMPLETED,
            'final_score' => 70,
            'ai_feedback' => 'auto-feedback',
            'evaluated_by' => 'system',
            'submitted_at' => now(),
            'evaluated_at' => now(),
        ]);

        // Create a fake AI evaluation history record to ensure it doesn't get touched
        AiEvaluation::create([
            'submission_id' => $submission->id,
            'provider' => 'fake',
            'model' => 'fake-model',
            'status' => 'succeeded',
            'score' => 70,
            'feedback' => 'auto',
            'metadata' => ['model' => 'fake-model'],
            'started_at' => now(),
            'completed_at' => now(),
        ]);

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/learning/submissions/{$submission->id}/review", [
                'status' => 'evaluated',
                'final_score' => 92.5,
                'feedback' => 'Admin override: much better',
                'rubric_scores' => [
                    ['criterion' => 'Structure', 'score' => 28, 'max_points' => 30],
                    ['criterion' => 'Validation', 'score' => 38, 'max_points' => 40],
                    ['criterion' => 'Styling', 'score' => 26, 'max_points' => 30],
                ],
            ])
            ->assertStatus(200)
            ->assertJsonPath('data.evaluated_by', 'admin')
            ->assertJsonPath('data.final_score', 92.5)
            ->assertJsonPath('data.rubric_scores.0.criterion', 'Structure');

        $submission->refresh();

        $this->assertEquals('evaluated', $submission->status);
        $this->assertEquals('completed', $submission->evaluation_status);
        $this->assertEquals('admin', $submission->evaluated_by);
        $this->assertEquals(92.5, $submission->final_score);
        $this->assertIsArray($submission->rubric_scores);

        // Ensure ai_evaluations history remains unchanged (1 entry)
        $this->assertEquals(1, AiEvaluation::where('submission_id', $submission->id)->count());
    }

    public function test_student_is_forbidden_from_admin_review(): void
    {
        $student = User::factory()->create(['role' => 'student']);
        $block = RoadmapBlock::factory()->create([ 'level' => 'beginner', 'domain' => 'frontend', 'order_index' => 1 ]);
        $task = Task::factory()->create(['roadmap_block_id' => $block->id]);

        $submission = Submission::create([
            'user_id' => $student->id,
            'task_id' => $task->id,
            'answer_text' => 'answer',
            'status' => 'evaluated',
            'evaluation_status' => Submission::EVAL_COMPLETED,
            'final_score' => 50,
        ]);

        $this->actingAs($student, 'sanctum')
            ->postJson("/api/admin/learning/submissions/{$submission->id}/review", [
                'status' => 'evaluated',
                'final_score' => 90,
            ])
            ->assertStatus(403);
    }

    public function test_admin_can_queue_re_evaluate(): void
    {
        // Fake the queue so jobs don't execute synchronously
        \Illuminate\Support\Facades\Queue::fake();

        $admin = User::factory()->create(['role' => 'admin']);
        $student = User::factory()->create(['role' => 'student']);

        $block = RoadmapBlock::factory()->create([ 'level' => 'beginner', 'domain' => 'frontend', 'order_index' => 1 ]);
        $task = Task::factory()->create(['roadmap_block_id' => $block->id]);

        $submission = Submission::create([
            'user_id' => $student->id,
            'task_id' => $task->id,
            'answer_text' => 'answer',
            'status' => 'submitted',
            // evaluation_status will default to 'queued' via model $attributes
        ]);

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/learning/submissions/{$submission->id}/re-evaluate")
            ->assertStatus(200)
            ->assertJsonStructure(['message', 'submission_id', 'evaluation_request_id']);

        $submission->refresh();
        $this->assertEquals('queued', $submission->evaluation_status);
        $this->assertDatabaseHas('ai_evaluations', ['submission_id' => $submission->id, 'status' => 'queued']);

        // Verify job was dispatched
        \Illuminate\Support\Facades\Queue::assertPushed(\App\Jobs\EvaluateSubmissionJob::class);
    }
}
