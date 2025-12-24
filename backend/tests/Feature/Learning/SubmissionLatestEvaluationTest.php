<?php

namespace Tests\Feature\Learning;

use App\Modules\Learning\Infrastructure\Models\Submission;
use App\Modules\Learning\Infrastructure\Models\Task;
use App\Modules\Learning\Infrastructure\Models\RoadmapBlock;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SubmissionLatestEvaluationTest extends TestCase
{
    use RefreshDatabase;

    public function test_get_submission_returns_latest_ai_evaluation_even_if_pointer_missing(): void
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

        $submission = Submission::create([
            'user_id' => $student->id,
            'task_id' => $task->id,
            'status' => 'submitted',
            'submitted_at' => now(),
        ]);

        // Insert an ai_evaluation row but DO NOT set latest_ai_evaluation_id on submission
        $aeId = DB::table('ai_evaluations')->insertGetId([
            'submission_id' => $submission->id,
            'provider' => 'openai',
            'status' => 'failed',
            'score' => null,
            'feedback' => null,
            'metadata' => json_encode(['evaluation_outcome' => 'manual_review', 'reason' => 'Missing repo']),
            'started_at' => now(),
            'completed_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Ensure submission.latest_ai_evaluation_id is null
        $submission->refresh();
        $this->assertNull($submission->latest_ai_evaluation_id);

        $res = $this->getJson("/api/student/submissions/{$submission->id}");
        $res->assertStatus(200)
            ->assertJsonPath('data.ai_evaluation.id', $aeId)
            ->assertJsonPath('data.ai_evaluation.semantic_status', 'manual_review')
            ->assertJsonPath('data.evaluation_status', 'manual_review')
            ->assertJsonPath('data.user_message', 'Needs manual review');
    }

    public function test_ai_disabled_maps_to_manual_review_message(): void
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

        $submission = Submission::create([
            'user_id' => $student->id,
            'task_id' => $task->id,
            'status' => 'submitted',
            'submitted_at' => now(),
        ]);

        $aeId = DB::table('ai_evaluations')->insertGetId([
            'submission_id' => $submission->id,
            'provider' => 'openai',
            'status' => 'failed',
            'score' => null,
            'feedback' => null,
            'metadata' => json_encode(['evaluation_outcome' => 'manual_review', 'reason' => 'ai_disabled', 'ai_disabled' => true]),
            'started_at' => now(),
            'completed_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $res = $this->getJson("/api/student/submissions/{$submission->id}");
        $res->assertStatus(200)
            ->assertJsonPath('data.ai_evaluation.id', $aeId)
            ->assertJsonPath('data.ai_evaluation.status', 'failed')
            ->assertJsonPath('data.ai_evaluation.semantic_status', 'manual_review')
            ->assertJsonPath('data.evaluation_status', 'manual_review')
            ->assertJsonPath('data.user_message', 'Needs manual review (AI disabled)');
    }

    public function test_queued_evaluation_reports_pending(): void
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

        $submission = Submission::create([
            'user_id' => $student->id,
            'task_id' => $task->id,
            'status' => 'submitted',
            'submitted_at' => now(),
        ]);

        $aeId = DB::table('ai_evaluations')->insertGetId([
            'submission_id' => $submission->id,
            'provider' => 'openai',
            'status' => 'queued',
            'score' => null,
            'feedback' => null,
            'metadata' => json_encode(['evaluation_outcome' => 'pending']),
            'started_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $res = $this->getJson("/api/student/submissions/{$submission->id}");
        $res->assertStatus(200)
            ->assertJsonPath('data.ai_evaluation.id', $aeId)
            ->assertJsonPath('data.ai_evaluation.status', 'queued')
            ->assertJsonPath('data.ai_evaluation.semantic_status', 'pending')
            ->assertJsonPath('data.evaluation_status', 'pending');
    }
}

