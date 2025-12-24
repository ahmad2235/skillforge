<?php

namespace Tests\Feature\Learning;

use App\Jobs\EvaluateSubmissionJob;
use App\Models\User;
use App\Modules\Learning\Infrastructure\Models\RoadmapBlock;
use App\Modules\Learning\Infrastructure\Models\Task;
use App\Modules\Learning\Infrastructure\Models\Submission;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\DB;
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

    public function test_submit_creates_queued_ai_evaluation_and_pointer(): void
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

        $response->assertStatus(201);

        $submission = Submission::first();

        $this->assertNotNull($submission->latest_ai_evaluation_id);
        $this->assertDatabaseHas('ai_evaluations', [
            'submission_id' => $submission->id,
            'status' => 'queued',
        ]);

        Queue::assertPushed(EvaluateSubmissionJob::class);
    }

    public function test_requires_attachment_validation(): void
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

        // Create a task that requires attachment
        $task = Task::factory()->create([
            'roadmap_block_id' => $block->id,
            'metadata' => ['requires_attachment' => true],
        ]);

        Sanctum::actingAs($student);

        $response = $this->postJson("/api/student/tasks/{$task->id}/submit", [
            'answer_text' => 'My solution without file',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('errors.attachment_url.0', 'Attachment is required for this task.');

        // Ensure no submission was created
        $this->assertDatabaseMissing('submissions', [
            'user_id' => $student->id,
            'task_id' => $task->id,
        ]);
    }

    public function test_get_submission_returns_semantic_status_and_user_message(): void
    {
        $student = User::factory()->student()->create([
            'level' => 'beginner',
            'domain' => 'frontend',
        ]);

        $block = RoadmapBlock::factory()->create([
            'level' => 'beginner',
            'domain' => 'frontend',
            'order_index' => 1,
        ]);

        $task = Task::factory()->create(['roadmap_block_id' => $block->id]);

        Sanctum::actingAs($student);

        // 1) Pending (no ai evaluation yet)
        $submission = Submission::create([
            'user_id' => $student->id,
            'task_id' => $task->id,
            'status' => 'submitted',
        ]);

        $res1 = $this->getJson("/api/student/submissions/{$submission->id}");
        $res1->assertStatus(200)
            ->assertJsonPath('data.evaluation_status', 'pending')
            ->assertJsonPath('data.user_message', 'Evaluation in progress')
            ->assertJsonPath('data.ai_evaluation', null);

        // 2) Completed via ai_evaluations (succeeded)
        $ae = DB::table('ai_evaluations')->insertGetId([
            'submission_id' => $submission->id,
            'status' => 'succeeded',
            'score' => 88,
            'feedback' => 'Good job',
            'metadata' => json_encode([]),
            'created_at' => now(),
            'completed_at' => now(),
        ]);
        $submission->latest_ai_evaluation_id = $ae;
        $submission->is_evaluated = true;
        $submission->save();

        $res2 = $this->getJson("/api/student/submissions/{$submission->id}");
        $res2->assertStatus(200)
            ->assertJsonPath('data.evaluation_status', 'completed')
            ->assertJsonPath('data.user_message', 'Evaluation complete')
            ->assertJsonPath('data.ai_evaluation.semantic_status', 'completed');

        // 2b) Queued evaluation must map to pending (not failed)
        $aeQueued = DB::table('ai_evaluations')->insertGetId([
            'submission_id' => $submission->id,
            'status' => 'queued',
            'metadata' => json_encode(['evaluation_outcome' => 'pending']),
            'created_at' => now(),
        ]);
        $submission->latest_ai_evaluation_id = $aeQueued;
        $submission->status = 'submitted';
        $submission->is_evaluated = false;
        $submission->save();

        $resQueued = $this->getJson("/api/student/submissions/{$submission->id}");
        $resQueued->assertStatus(200)
            ->assertJsonPath('data.evaluation_status', 'pending')
            ->assertJsonPath('data.ai_evaluation.semantic_status', 'pending');

        // 3) Manual review mapping (failed + evaluation_outcome manual_review)
        $ae2 = DB::table('ai_evaluations')->insertGetId([
            'submission_id' => $submission->id,
            'status' => 'failed',
            'score' => null,
            'feedback' => null,
            'metadata' => json_encode(['evaluation_outcome' => 'manual_review', 'reason' => 'Missing file']),
            'created_at' => now(),
        ]);
        $submission->latest_ai_evaluation_id = $ae2;
        $submission->status = 'needs_manual_review';
        $submission->save();

        $res3 = $this->getJson("/api/student/submissions/{$submission->id}");
        $res3->assertStatus(200)
            ->assertJsonPath('data.evaluation_status', 'manual_review')
            ->assertJsonPath('data.user_message', 'Needs manual review')
            ->assertJsonPath('data.ai_evaluation.semantic_status', 'manual_review');

        // 4) Evaluator timeout mapping (failed + manual_review + reason = evaluator_timeout)
        $ae3 = DB::table('ai_evaluations')->insertGetId([
            'submission_id' => $submission->id,
            'status' => 'failed',
            'score' => null,
            'feedback' => null,
            'metadata' => json_encode(['evaluation_outcome' => 'manual_review', 'reason' => 'evaluator_timeout']),
            'created_at' => now(),
        ]);
        $submission->latest_ai_evaluation_id = $ae3;
        $submission->status = 'needs_manual_review';
        $submission->save();

        $res4 = $this->getJson("/api/student/submissions/{$submission->id}");
        $res4->assertStatus(200)
            ->assertJsonPath('data.evaluation_status', 'manual_review')
            ->assertJsonPath('data.user_message', 'Evaluation timed out. Please try again later or ask an admin to review.')
            ->assertJsonPath('data.ai_evaluation.semantic_status', 'manual_review')
            ->assertJsonPath('data.ai_evaluation.meta.reason', 'evaluator_timeout');
    }

    public function test_requires_attachment_allows_submission_when_attachment_provided(): void
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

        // Create a task that requires attachment
        $task = Task::factory()->create([
            'roadmap_block_id' => $block->id,
            'metadata' => ['requires_attachment' => true, 'attachment_type' => 'url'],
        ]);

        Sanctum::actingAs($student);

        $response = $this->postJson("/api/student/tasks/{$task->id}/submit", [
            'answer_text' => 'My solution with file',
            'attachment_url' => 'https://example.com/submission.zip',
        ]);

        $response->assertStatus(201)
            ->assertJsonFragment(['message' => 'Task submitted successfully.']);

        $this->assertDatabaseHas('submissions', [
            'user_id' => $student->id,
            'task_id' => $task->id,
            'attachment_url' => 'https://example.com/submission.zip',
        ]);

        Queue::assertPushed(EvaluateSubmissionJob::class);
    }
}
