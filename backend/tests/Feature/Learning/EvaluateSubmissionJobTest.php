<?php

namespace Tests\Feature\Learning;

use App\Jobs\EvaluateSubmissionJob;
use App\Modules\AI\Providers\AiProviderInterface;
use App\Modules\AI\Providers\FakeAiProvider;
use App\Modules\Learning\Infrastructure\Models\Submission;
use App\Modules\Learning\Infrastructure\Models\Task;
use App\Modules\Learning\Infrastructure\Models\RoadmapBlock;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class EvaluateSubmissionJobTest extends TestCase
{
    use RefreshDatabase;

    public function test_evaluate_submission_job_creates_history_and_updates_submission(): void
    {
        // Bind the fake provider for deterministic results
        $this->app->bind(AiProviderInterface::class, FakeAiProvider::class);

        $user = User::factory()->create(['role' => 'student']);

        $block = RoadmapBlock::factory()->create([ 'level' => 'beginner', 'domain' => 'frontend', 'order_index' => 1 ]);

        $task = Task::create([
            'roadmap_block_id' => $block->id,
            'title' => 'Rubric Task',
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
            'user_id' => $user->id,
            'task_id' => $task->id,
            'answer_text' => str_repeat('a', 20),
            'status' => 'submitted',
            'submitted_at' => now(),
        ]);

        // Run job synchronously
        dispatch_sync(new EvaluateSubmissionJob($submission->id));

        $submission->refresh();

        // Assert ai_evaluations row created
        $this->assertDatabaseHas('ai_evaluations', [
            'submission_id' => $submission->id,
            'status' => 'succeeded',
        ]);

        // Submission updated (canonical evaluation_status)
        $this->assertEquals('completed', $submission->evaluation_status);
        $this->assertTrue((bool) $submission->is_evaluated);
        $this->assertNotNull($submission->ai_feedback);
        $this->assertNotNull($submission->latest_ai_evaluation_id);

        // final_score should match ai score stored in ai_evaluations
        $aiEval = DB::table('ai_evaluations')->where('submission_id', $submission->id)->first();
        $this->assertNotNull($aiEval);
        $this->assertEquals($aiEval->score, $submission->final_score);

        // Verify metadata contains expected provider/model info for successful evaluations
        $meta = json_decode($aiEval->metadata ?? 'null', true) ?: [];
        $this->assertEquals('fake-model', $meta['model'] ?? null);
        // evaluator_elapsed_ms / evaluator_http_status are optional and only present when available (HTTP evaluator)
        if (isset($meta['evaluator_elapsed_ms'])) {
            $this->assertIsInt($meta['evaluator_elapsed_ms']);
        }
        if (isset($meta['evaluator_http_status'])) {
            $this->assertIsInt($meta['evaluator_http_status']);
        }
    }

    public function test_missing_attachment_creates_skipped_or_manual_review(): void
    {
        // Task requires attachment -> manual_review outcome
        $user = User::factory()->create(['role' => 'student']);
        $block = RoadmapBlock::factory()->create([ 'level' => 'beginner', 'domain' => 'frontend', 'order_index' => 1 ]);

        $taskManual = Task::create([
            'roadmap_block_id' => $block->id,
            'title' => 'Require Attachment Task',
            'type' => 'project',
            'metadata' => ['requires_attachment' => true],
        ]);

        $sub1 = Submission::create([
            'user_id' => $user->id,
            'task_id' => $taskManual->id,
            'status' => 'submitted',
        ]);

        dispatch_sync(new EvaluateSubmissionJob($sub1->id));
        $sub1->refresh();

        $this->assertEquals('manual_review', $sub1->evaluation_status);
        // Ensure an ai_evaluations record was created and metadata indicates manual review outcome
        $this->assertDatabaseHas('ai_evaluations', [
            'submission_id' => $sub1->id,
            'status' => 'failed',
        ]);
        $ae1 = DB::table('ai_evaluations')->where('submission_id', $sub1->id)->first();
        $meta1 = json_decode($ae1->metadata ?? 'null', true);
        $this->assertEquals('manual_review', $meta1['evaluation_outcome'] ?? null);

        // Task does NOT require attachment -> skipped outcome
        $taskSkip = Task::create([
            'roadmap_block_id' => $block->id,
            'title' => 'Optional Attachment Task',
            'type' => 'coding',
            'metadata' => ['requires_attachment' => false],
        ]);

        $sub2 = Submission::create([
            'user_id' => $user->id,
            'task_id' => $taskSkip->id,
            'status' => 'submitted',
            'evaluation_status' => null,
        ]);

        dispatch_sync(new EvaluateSubmissionJob($sub2->id));
        $sub2->refresh();

        $this->assertEquals('skipped', $sub2->evaluation_status);
        // Skipped outcome recorded as failed status with evaluation_outcome metadata
        $this->assertDatabaseHas('ai_evaluations', [
            'submission_id' => $sub2->id,
            'status' => 'failed',
        ]);
        $ae2 = DB::table('ai_evaluations')->where('submission_id', $sub2->id)->first();
        $meta2 = json_decode($ae2->metadata ?? 'null', true);
        $this->assertEquals('skipped', $meta2['evaluation_outcome'] ?? null);
    }

    public function test_ai_disabled_marks_manual_review_and_does_not_set_scores(): void
    {
        // Bind a provider that indicates AI disabled
        $this->app->bind(AiProviderInterface::class, function () {
            return new class implements AiProviderInterface {
                public function evaluate(\App\Modules\Learning\Infrastructure\Models\Submission $submission): array
                {
                    return [
                        'provider' => 'fake',
                        'model' => 'fake-model',
                        'score' => null,
                        'feedback' => 'AI evaluation disabled in this environment',
                        'metadata' => ['ai_disabled' => true, 'reason' => 'ai_disabled'],
                    ];
                }
            };
        });

        $user = User::factory()->create(['role' => 'student']);
        $block = RoadmapBlock::factory()->create([ 'level' => 'beginner', 'domain' => 'frontend', 'order_index' => 1 ]);

        $task = Task::create([
            'roadmap_block_id' => $block->id,
            'title' => 'Test Task',
            'type' => 'coding',
        ]);

        $submission = Submission::create([
            'user_id' => $user->id,
            'task_id' => $task->id,
            'status' => 'submitted',
        ]);

        dispatch_sync(new EvaluateSubmissionJob($submission->id));
        $submission->refresh();

        // Submission should be marked for manual review
        $this->assertEquals('manual_review', $submission->evaluation_status);
        $this->assertFalse((bool) $submission->is_evaluated);
        $this->assertNull($submission->final_score);
        $this->assertNull($submission->ai_score); // Critical: AI score must be null

        // An ai_evaluations record should exist with failed status and metadata evaluation_outcome manual_review
        $this->assertDatabaseHas('ai_evaluations', [
            'submission_id' => $submission->id,
            'status' => 'failed',
        ]);
        $ae = DB::table('ai_evaluations')->where('submission_id', $submission->id)->first();
        $meta = json_decode($ae->metadata ?? 'null', true);
        $this->assertEquals('manual_review', $meta['evaluation_outcome'] ?? null);
        $this->assertEquals('ai_disabled', $meta['reason'] ?? null);
        $this->assertNull($ae->score); // Critical: AI evaluation score must be null
    }}


