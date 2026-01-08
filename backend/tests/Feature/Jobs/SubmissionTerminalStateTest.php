<?php

namespace Tests\Feature\Jobs;

use Tests\TestCase;
use App\Models\User;
use App\Jobs\EvaluateSubmissionJob;
use App\Jobs\CleanupStuckSubmissionsJob;
use App\Modules\Learning\Infrastructure\Models\Submission;
use App\Modules\Learning\Infrastructure\Models\Task;
use App\Modules\Learning\Infrastructure\Models\RoadmapBlock;
use App\Modules\Learning\Infrastructure\Models\AiEvaluation;
use App\Modules\AI\Application\Services\TaskEvaluationService;
use App\Modules\AI\Application\Services\AiLogger;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Mockery;
use Carbon\Carbon;

/**
 * Tests proving submissions ALWAYS reach a terminal state after job completion.
 * 
 * Terminal states: completed, timed_out, manual_review, failed, skipped
 * Non-terminal states: queued, evaluating
 * 
 * Invariant: After any job execution path (success, failure, timeout, unavailable),
 * the submission's evaluation_status MUST be a terminal state.
 */
class SubmissionTerminalStateTest extends TestCase
{
    use RefreshDatabase;

    private User $student;
    private RoadmapBlock $block;
    private Task $task;

    protected function setUp(): void
    {
        parent::setUp();

        $this->student = User::factory()->create(['role' => 'student', 'level' => 'beginner', 'domain' => 'frontend']);
        
        $this->block = RoadmapBlock::create([
            'title' => 'Test Block',
            'description' => 'Test',
            'level' => 'beginner',
            'domain' => 'frontend',
            'order_index' => 1,
        ]);
        
        $this->task = Task::create([
            'roadmap_block_id' => $this->block->id,
            'title' => 'Test Task',
            'description' => 'Test Description',
            'type' => 'project',
        ]);
    }

    /**
     * Test: Successful evaluation sets status to 'completed'.
     */
    public function test_successful_evaluation_sets_completed_status(): void
    {
        $submission = Submission::create([
            'user_id' => $this->student->id,
            'task_id' => $this->task->id,
            'evaluation_status' => Submission::EVAL_QUEUED,
            'attachment_url' => 'https://github.com/test/repo',
            'status' => 'submitted',
        ]);

        // Mock the evaluation service to return success
        $mockService = Mockery::mock(TaskEvaluationService::class);
        $mockService->shouldReceive('evaluateSubmission')->andReturn([
            'status' => 'completed',
            'score' => 85,
            'feedback' => 'Great work!',
            'metadata' => ['model' => 'gpt-4'],
        ]);

        $this->app->instance(TaskEvaluationService::class, $mockService);

        $job = new EvaluateSubmissionJob($submission->id);
        $job->handle($mockService, app(AiLogger::class));

        $submission->refresh();

        $this->assertEquals(
            Submission::EVAL_COMPLETED,
            $submission->evaluation_status,
            'Successful evaluation must set status to completed'
        );
        $this->assertNotNull($submission->latest_ai_evaluation_id);
    }

    /**
     * Test: Unavailable evaluator sets status to 'manual_review'.
     */
    public function test_unavailable_evaluator_sets_manual_review_status(): void
    {
        $submission = Submission::create([
            'user_id' => $this->student->id,
            'task_id' => $this->task->id,
            'evaluation_status' => Submission::EVAL_QUEUED,
            'attachment_url' => 'https://github.com/test/repo',
            'status' => 'submitted',
        ]);

        // Mock the evaluation service to return unavailable
        $mockService = Mockery::mock(TaskEvaluationService::class);
        $mockService->shouldReceive('evaluateSubmission')->andReturn([
            'status' => 'unavailable',
            'score' => null,
            'feedback' => 'AI evaluator is unavailable',
            'metadata' => ['reason' => 'healthcheck_failed', 'evaluation_outcome' => 'manual_review'],
        ]);

        $this->app->instance(TaskEvaluationService::class, $mockService);

        $job = new EvaluateSubmissionJob($submission->id);
        $job->handle($mockService, app(AiLogger::class));

        $submission->refresh();

        $this->assertEquals(
            Submission::EVAL_MANUAL_REVIEW,
            $submission->evaluation_status,
            'Unavailable evaluator must set status to manual_review'
        );
    }

    /**
     * Test: AI disabled sets status to 'manual_review'.
     */
    public function test_ai_disabled_sets_manual_review_status(): void
    {
        $submission = $this->createSubmission([
            'evaluation_status' => Submission::EVAL_QUEUED,
            'attachment_url' => 'https://github.com/test/repo',
        ]);

        // Mock the evaluation service to return ai_disabled
        $mockService = Mockery::mock(TaskEvaluationService::class);
        $mockService->shouldReceive('evaluateSubmission')->andReturn([
            'status' => 'unavailable',
            'score' => null,
            'feedback' => 'AI evaluation is disabled',
            'metadata' => ['reason' => 'ai_disabled', 'evaluation_outcome' => 'manual_review'],
        ]);

        $this->app->instance(TaskEvaluationService::class, $mockService);

        $job = new EvaluateSubmissionJob($submission->id);
        $job->handle($mockService, app(AiLogger::class));

        $submission->refresh();

        $this->assertEquals(
            Submission::EVAL_MANUAL_REVIEW,
            $submission->evaluation_status,
            'AI disabled must set status to manual_review'
        );
    }

    /**
     * Test: Skipped evaluation sets status to 'skipped'.
     */
    public function test_skipped_evaluation_sets_skipped_status(): void
    {
        $submission = $this->createSubmission([
            'evaluation_status' => Submission::EVAL_QUEUED,
            'attachment_url' => 'https://github.com/test/repo',
        ]);

        // Mock the evaluation service to return skipped
        $mockService = Mockery::mock(TaskEvaluationService::class);
        $mockService->shouldReceive('evaluateSubmission')->andReturn([
            'status' => 'unavailable',
            'score' => null,
            'feedback' => 'No content to evaluate',
            'metadata' => ['reason' => 'no_content', 'evaluation_outcome' => 'skipped'],
        ]);

        $this->app->instance(TaskEvaluationService::class, $mockService);

        $job = new EvaluateSubmissionJob($submission->id);
        $job->handle($mockService, app(AiLogger::class));

        $submission->refresh();

        $this->assertEquals(
            Submission::EVAL_SKIPPED,
            $submission->evaluation_status,
            'Skipped evaluation must set status to skipped'
        );
    }

    /**
     * Test: Job failure (exception) triggers failed() and sets 'failed' status.
     */
    public function test_job_failure_sets_failed_status(): void
    {
        $submission = $this->createSubmission([
            'evaluation_status' => Submission::EVAL_EVALUATING, // Simulating mid-evaluation
            'attachment_url' => 'https://github.com/test/repo',
        ]);

        $job = new EvaluateSubmissionJob($submission->id);
        
        // Simulate job failure
        $exception = new \RuntimeException('Connection refused');
        $job->failed($exception);

        $submission->refresh();

        $this->assertEquals(
            Submission::EVAL_FAILED,
            $submission->evaluation_status,
            'Job failure must set status to failed'
        );
        $this->assertNotNull($submission->latest_ai_evaluation_id);
        // The exception message is stored in ai_metadata, not ai_feedback
        $this->assertStringContainsString('Connection refused', $submission->ai_metadata['message'] ?? '');
    }

    /**
     * Test: Job timeout triggers failed() and sets 'timed_out' status.
     */
    public function test_job_timeout_sets_timed_out_status(): void
    {
        $submission = $this->createSubmission([
            'evaluation_status' => Submission::EVAL_EVALUATING,
            'attachment_url' => 'https://github.com/test/repo',
        ]);

        $job = new EvaluateSubmissionJob($submission->id);
        
        // Simulate timeout exception
        $exception = new \Illuminate\Queue\MaxAttemptsExceededException('Job has been attempted too many times or run timeout');
        $job->failed($exception);

        $submission->refresh();

        $this->assertEquals(
            Submission::EVAL_TIMED_OUT,
            $submission->evaluation_status,
            'Job timeout must set status to timed_out'
        );
    }

    /**
     * Test: CleanupStuckSubmissionsJob transitions stuck 'evaluating' to 'timed_out'.
     */
    public function test_cleanup_job_transitions_stuck_evaluating_to_timed_out(): void
    {
        // Create a submission stuck in evaluating for 20 minutes
        $submission = $this->createSubmission([
            'evaluation_status' => Submission::EVAL_EVALUATING,
        ]);
        
        // Manually update the updated_at to simulate being stuck
        Submission::where('id', $submission->id)->update(['updated_at' => Carbon::now()->subMinutes(20)]);

        // Run cleanup job
        $job = new CleanupStuckSubmissionsJob();
        $job->handle(app(AiLogger::class));

        $submission->refresh();

        $this->assertEquals(
            Submission::EVAL_TIMED_OUT,
            $submission->evaluation_status,
            'Stuck evaluating submission must be cleaned up to timed_out'
        );
        $this->assertStringContainsString('stuck in evaluating', $submission->ai_feedback);
    }

    /**
     * Test: CleanupStuckSubmissionsJob transitions stuck 'queued' to 'timed_out'.
     */
    public function test_cleanup_job_transitions_stuck_queued_to_timed_out(): void
    {
        // Create a submission stuck in queued for 35 minutes
        $submission = $this->createSubmission([
            'evaluation_status' => Submission::EVAL_QUEUED,
        ]);
        
        // Manually update the updated_at to simulate being stuck
        Submission::where('id', $submission->id)->update(['updated_at' => Carbon::now()->subMinutes(35)]);

        // Run cleanup job
        $job = new CleanupStuckSubmissionsJob();
        $job->handle(app(AiLogger::class));

        $submission->refresh();

        $this->assertEquals(
            Submission::EVAL_TIMED_OUT,
            $submission->evaluation_status,
            'Stuck queued submission must be cleaned up to timed_out'
        );
    }

    /**
     * Test: CleanupStuckSubmissionsJob ignores recent submissions.
     */
    public function test_cleanup_job_ignores_recent_submissions(): void
    {
        // Create a submission that just started evaluating (5 minutes ago)
        $submission = $this->createSubmission([
            'evaluation_status' => Submission::EVAL_EVALUATING,
        ]);
        
        // Manually update the updated_at to simulate 5 minutes ago
        Submission::where('id', $submission->id)->update(['updated_at' => Carbon::now()->subMinutes(5)]);

        // Run cleanup job
        $job = new CleanupStuckSubmissionsJob();
        $job->handle(app(AiLogger::class));

        $submission->refresh();

        $this->assertEquals(
            Submission::EVAL_EVALUATING,
            $submission->evaluation_status,
            'Recent evaluating submission should NOT be cleaned up'
        );
    }

    /**
     * Test: Terminal states are not affected by cleanup job.
     */
    public function test_cleanup_job_ignores_terminal_states(): void
    {
        $terminalStates = [
            Submission::EVAL_COMPLETED,
            Submission::EVAL_TIMED_OUT,
            Submission::EVAL_MANUAL_REVIEW,
            Submission::EVAL_FAILED,
            Submission::EVAL_SKIPPED,
        ];

        foreach ($terminalStates as $state) {
            $submission = $this->createSubmission([
                'evaluation_status' => $state,
            ]);
            
            // Manually update the updated_at to simulate being very old
            Submission::where('id', $submission->id)->update(['updated_at' => Carbon::now()->subMinutes(60)]);

            $job = new CleanupStuckSubmissionsJob();
            $job->handle(app(AiLogger::class));

            $submission->refresh();

            $this->assertEquals(
                $state,
                $submission->evaluation_status,
                "Terminal state '{$state}' should NOT be modified by cleanup job"
            );
        }
    }

    /**
     * Test: retryUntil() returns a future timestamp.
     */
    public function test_retry_until_returns_future_timestamp(): void
    {
        $submission = $this->createSubmission();

        $job = new EvaluateSubmissionJob($submission->id);
        $retryUntil = $job->retryUntil();

        $this->assertInstanceOf(Carbon::class, $retryUntil);
        $this->assertTrue($retryUntil->isFuture(), 'retryUntil must return a future timestamp');
        // Check that retryUntil is roughly 10 minutes in the future (between 9-11 min to account for test execution time)
        $diffInMinutes = now()->diffInMinutes($retryUntil);
        $this->assertTrue(
            $diffInMinutes >= 9 && $diffInMinutes <= 11,
            "retryUntil should be about 10 minutes in the future, got {$diffInMinutes} minutes"
        );
    }

    /**
     * Helper method to create submissions.
     */
    private function createSubmission(array $attributes = []): Submission
    {
        return Submission::create(array_merge([
            'user_id' => $this->student->id,
            'task_id' => $this->task->id,
            'status' => 'submitted',
            'evaluation_status' => Submission::EVAL_QUEUED,
        ], $attributes));
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }
}
