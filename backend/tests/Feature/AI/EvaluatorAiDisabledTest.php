<?php

namespace Tests\Feature\AI;

use App\Jobs\EvaluateSubmissionJob;
use App\Modules\Learning\Infrastructure\Models\Submission;
use App\Modules\Learning\Infrastructure\Models\Task;
use App\Modules\Learning\Infrastructure\Models\RoadmapBlock;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * Test that evaluator correctly handles and signals AI disabled state.
 * This ensures the backend properly detects and stores the correct metadata.
 */
class EvaluatorAiDisabledTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test that when evaluator returns ai_disabled error (status 503),
     * the submission is marked needs_manual_review with null scores.
     */
    public function test_evaluator_ai_disabled_error_creates_manual_review_with_null_scores(): void
    {
        // Mock evaluator to return ai_disabled error
        Http::fake([
            // Health check must succeed so the service proceeds to POST /evaluate
            '127.0.0.1:8001/health' => Http::response(['ok' => true], 200),
            // Evaluator returns ai_disabled error on evaluate
            '127.0.0.1:8001/evaluate' => Http::response([
                'success' => false,
                'error' => [
                    'type' => 'ai_disabled',
                    'reason' => 'ai_disabled',
                    'message' => 'AI evaluation is disabled. Manual review required.',
                ],
            ], 503),
        ]);

        $user = User::factory()->create(['role' => 'student']);
        $block = RoadmapBlock::factory()->create(['level' => 'beginner', 'domain' => 'frontend', 'order_index' => 1]);
        $task = Task::create([
            'roadmap_block_id' => $block->id,
            'title' => 'Test Task',
            'type' => 'project',
            'metadata' => ['requires_attachment' => true],
        ]);

        $submission = Submission::create([
            'user_id' => $user->id,
            'task_id' => $task->id,
            'attachment_url' => 'https://github.com/user/repo',
            'answer_text' => 'My solution',
            'status' => 'submitted',
            'submitted_at' => now(),
        ]);

        // Run job synchronously
        dispatch_sync(new EvaluateSubmissionJob($submission->id));
        $submission->refresh();

        // Submission should be marked for manual review (evaluation_status) and not evaluated
        $this->assertEquals(Submission::EVAL_MANUAL_REVIEW, $submission->evaluation_status);
        $this->assertFalse((bool) $submission->is_evaluated);

        // **CRITICAL:** Scores must be NULL (not 0 or any number)
        $this->assertNull($submission->ai_score, 'ai_score must be null for ai_disabled');
        $this->assertNull($submission->final_score, 'final_score must be null for ai_disabled');
        $this->assertNull($submission->rubric_scores, 'rubric_scores must be null for ai_disabled');

        // AI evaluation record should exist with failed status
        $this->assertDatabaseHas('ai_evaluations', [
            'submission_id' => $submission->id,
            'status' => 'failed',
            'score' => null, // CRITICAL: score must be null
        ]);

        // Verify metadata contains ai_disabled indicator
        $ae = DB::table('ai_evaluations')->where('submission_id', $submission->id)->first();
        $meta = json_decode($ae->metadata ?? 'null', true);
        $this->assertEquals('manual_review', $meta['evaluation_outcome'] ?? null);
        $this->assertEquals('ai_disabled', $meta['reason'] ?? null);
    }

    /**
     * Test that a successful evaluation (with actual scores) works correctly
     * and is NOT confused with ai_disabled state.
     */
    public function test_successful_evaluation_with_scores_is_evaluated_not_manual_review(): void
    {
        // Mock evaluator to return successful evaluation
        Http::fake([
            '127.0.0.1:8001/health' => Http::response(['ok' => true], 200),
            '127.0.0.1:8001/evaluate' => Http::response([
                'success' => true,
                'data' => [
                    'total_score' => 85,
                    'functional_score' => 60,
                    'code_quality_score' => 25,
                    'passed' => true,
                    'summary' => 'Good work!',
                    'ai_disabled' => false, // Explicitly NOT disabled
                ],
            ], 200),
        ]);

        $user = User::factory()->create(['role' => 'student']);
        $block = RoadmapBlock::factory()->create(['level' => 'beginner', 'domain' => 'frontend', 'order_index' => 1]);
        $task = Task::create([
            'roadmap_block_id' => $block->id,
            'title' => 'Test Task',
            'type' => 'project',
            'metadata' => ['requires_attachment' => true],
        ]);

        $submission = Submission::create([
            'user_id' => $user->id,
            'task_id' => $task->id,
            'attachment_url' => 'https://github.com/user/repo',
            'answer_text' => 'My solution',
            'status' => 'submitted',
            'submitted_at' => now(),
        ]);

        // Run job synchronously
        dispatch_sync(new EvaluateSubmissionJob($submission->id));
        $submission->refresh();

        // Submission should be marked evaluated (not needs_manual_review)
        $this->assertEquals('evaluated', $submission->status);
        $this->assertTrue((bool) $submission->is_evaluated);

        // **CRITICAL:** Scores must be set
        $this->assertEquals(85, $submission->final_score);
        $this->assertEquals(85, $submission->ai_score);

        // AI evaluation record should exist with succeeded status
        $this->assertDatabaseHas('ai_evaluations', [
            'submission_id' => $submission->id,
            'status' => 'succeeded',
            'score' => 85,
        ]);
    }

    /**
     * Test that when metadata contains ai_disabled=true despite success=true,
     * it's still treated as manual review (backward compatibility).
     */
    public function test_legacy_response_with_ai_disabled_in_data_is_treated_as_manual_review(): void
    {
        // Legacy response format: success=true but ai_disabled=true in data
        Http::fake([
            '127.0.0.1:8001/health' => Http::response(['ok' => true], 200),
            '127.0.0.1:8001/evaluate' => Http::response([
                'success' => true,
                'data' => [
                    'total_score' => null,
                    'ai_disabled' => true, // Legacy flag in data
                    'summary' => 'AI disabled',
                ],
            ], 200),
        ]);

        $user = User::factory()->create(['role' => 'student']);
        $block = RoadmapBlock::factory()->create(['level' => 'beginner', 'domain' => 'frontend', 'order_index' => 1]);
        $task = Task::create([
            'roadmap_block_id' => $block->id,
            'title' => 'Test Task',
            'type' => 'project',
            'metadata' => ['requires_attachment' => true],
        ]);

        $submission = Submission::create([
            'user_id' => $user->id,
            'task_id' => $task->id,
            'attachment_url' => 'https://github.com/user/repo',
            'answer_text' => 'My solution',
            'status' => 'submitted',
            'submitted_at' => now(),
        ]);

        // Run job synchronously
        dispatch_sync(new EvaluateSubmissionJob($submission->id));
        $submission->refresh();

        // Should still be treated as manual review
        $this->assertEquals(Submission::EVAL_MANUAL_REVIEW, $submission->evaluation_status);
        $this->assertFalse((bool) $submission->is_evaluated);
        $this->assertNull($submission->final_score);
        $this->assertNull($submission->ai_score);
    }

    /**
     * Test that API error responses (non-ai_disabled) also result in manual review.
     */
    public function test_api_error_response_creates_manual_review(): void
    {
        // Mock evaluator to return provider error
        Http::fake([
            '127.0.0.1:8001/health' => Http::response(['ok' => true], 200),
            '127.0.0.1:8001/evaluate' => Http::response([
                'success' => false,
                'error' => [
                    'type' => 'provider_error',
                    'reason' => 'api_error',
                    'message' => 'OpenAI API error',
                ],
            ], 502),
        ]);

        $user = User::factory()->create(['role' => 'student']);
        $block = RoadmapBlock::factory()->create(['level' => 'beginner', 'domain' => 'frontend', 'order_index' => 1]);
        $task = Task::create([
            'roadmap_block_id' => $block->id,
            'title' => 'Test Task',
            'type' => 'project',
            'metadata' => ['requires_attachment' => true],
        ]);

        $submission = Submission::create([
            'user_id' => $user->id,
            'task_id' => $task->id,
            'attachment_url' => 'https://github.com/user/repo',
            'answer_text' => 'My solution',
            'status' => 'submitted',
            'submitted_at' => now(),
        ]);

        // Run job synchronously
        dispatch_sync(new EvaluateSubmissionJob($submission->id));
        $submission->refresh();

        // Should be manual review for API errors too
        $this->assertEquals(Submission::EVAL_MANUAL_REVIEW, $submission->evaluation_status);
        $this->assertNull($submission->final_score);
        $this->assertNull($submission->ai_score);
    }
}
