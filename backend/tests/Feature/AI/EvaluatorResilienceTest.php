<?php

namespace Tests\Feature\AI;

use Tests\TestCase;
use App\Models\User;
use App\Modules\Learning\Infrastructure\Models\RoadmapBlock;
use App\Modules\Learning\Infrastructure\Models\Task;
use App\Modules\Learning\Infrastructure\Models\Submission;
use App\Modules\Learning\Infrastructure\Models\AiEvaluation;
use App\Jobs\EvaluateSubmissionJob;
use App\Modules\AI\Application\Services\TaskEvaluationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;

class EvaluatorResilienceTest extends TestCase
{
    use RefreshDatabase;

    private User $student;
    private Task $task;

    protected function setUp(): void
    {
        parent::setUp();

        $this->student = User::factory()->create([
            'role' => 'student',
            'level' => 'beginner',
            'domain' => 'frontend',
        ]);

        $block = RoadmapBlock::create([
            'title' => 'Test Block',
            'description' => 'Test',
            'level' => 'beginner',
            'domain' => 'frontend',
            'order_index' => 1,
        ]);

        $this->task = Task::create([
            'roadmap_block_id' => $block->id,
            'title' => 'Test Task',
            'description' => 'Build a simple calculator',
            'type' => 'project',
        ]);
    }

    /** @test */
    public function evaluator_unavailable_marks_submission_for_manual_review()
    {
        // Configure evaluator to point to non-existent service
        Config::set('services.evaluator.url', 'http://127.0.0.1:9999');
        Config::set('services.evaluator.health_timeout', 1);

        // Create submission
        $submission = Submission::create([
            'user_id' => $this->student->id,
            'task_id' => $this->task->id,
            'answer_text' => 'My solution',
            'attachment_url' => '/submissions/test.zip',
            'status' => 'submitted',
            'submitted_at' => now(),
        ]);

        // Run job synchronously
        $job = new EvaluateSubmissionJob($submission->id);
        $job->handle(app(TaskEvaluationService::class), app(\App\Modules\AI\Application\Services\AiLogger::class));

        // Assert submission marked for manual review
        $submission->refresh();
        $this->assertEquals(Submission::EVAL_MANUAL_REVIEW, $submission->evaluation_status);
        $this->assertStringContainsString('unavailable', strtolower($submission->ai_feedback));
        $this->assertFalse($submission->is_evaluated);

        // Assert ai_evaluations record created with failed status
        $evaluation = AiEvaluation::where('submission_id', $submission->id)->first();
        $this->assertNotNull($evaluation);
        $this->assertEquals('failed', $evaluation->status);
    }

    /** @test */
    public function evaluator_available_completes_evaluation_successfully()
    {
        // Mock successful evaluator response
        Http::fake([
            '*/health' => Http::response(null, 200),
            '*/evaluate' => Http::response([
                'success' => true,
                'data' => [
                    'total_score' => 85,
                    'functional_score' => 60,
                    'code_quality_score' => 25,
                    'passed' => true,
                    'model' => 'gpt-4',
                    'summary' => 'Good work!',
                ],
            ], 200),
        ]);

        // Create submission with actual file
        $filePath = storage_path('app/test_submission.txt');
        file_put_contents($filePath, 'test content');

        $submission = Submission::create([
            'user_id' => $this->student->id,
            'task_id' => $this->task->id,
            'answer_text' => 'My solution',
            'attachment_url' => '/test_submission.txt',
            'status' => 'submitted',
            'submitted_at' => now(),
        ]);

        // Run job synchronously
        $job = new EvaluateSubmissionJob($submission->id);
        $job->handle(app(TaskEvaluationService::class), app(\App\Modules\AI\Application\Services\AiLogger::class));

        // Assert submission evaluated successfully
        $submission->refresh();
        $this->assertEquals('evaluated', $submission->status);
        $this->assertEquals(85, $submission->ai_score);
        $this->assertNotNull($submission->ai_feedback);
        $this->assertTrue($submission->is_evaluated);
        $this->assertNotNull($submission->evaluated_at);

        // Assert ai_evaluations record created with succeeded status
        $evaluation = AiEvaluation::where('submission_id', $submission->id)->first();
        $this->assertNotNull($evaluation);
        $this->assertEquals('succeeded', $evaluation->status);
        $this->assertEquals(85, $evaluation->score);

        // Clean up
        @unlink($filePath);
    }

    /** @test */
    public function failed_job_marks_submission_for_manual_review()
    {
        // Point to non-existent evaluator
        Config::set('services.evaluator.url', 'http://127.0.0.1:9999');
        Config::set('services.evaluator.health_timeout', 1);

        $submission = Submission::create([
            'user_id' => $this->student->id,
            'task_id' => $this->task->id,
            'answer_text' => 'My solution',
            'attachment_url' => '/submissions/test.zip',
            'status' => 'submitted',
            'submitted_at' => now(),
        ]);

        $job = new EvaluateSubmissionJob($submission->id);
        
        // Simulate job failure
        $exception = new \Exception('Network timeout');
        $job->failed($exception);

        // Assert submission marked as failed (evaluation_status) and feedback updated
        $submission->refresh();
        $this->assertEquals(Submission::EVAL_FAILED, $submission->evaluation_status);
        $this->assertStringContainsString('evaluation failed', strtolower($submission->ai_feedback));

        // Assert ai_evaluations record exists
        $this->assertDatabaseHas('ai_evaluations', [
            'submission_id' => $submission->id,
            'status' => 'failed',
        ]);
    }

    /** @test */
    public function get_submission_endpoint_returns_correct_status_messages()
    {
        // Test pending evaluation
        $submission1 = Submission::create([
            'user_id' => $this->student->id,
            'task_id' => $this->task->id,
            'answer_text' => 'Solution 1',
            'evaluation_status' => 'evaluating',
            'submitted_at' => now(),
        ]);

        $response = $this->actingAs($this->student)->getJson("/api/student/submissions/{$submission1->id}");
        $response->assertOk();
        $response->assertJson([
            'data' => [
                'evaluation_status' => 'evaluating',
                'user_message' => 'Evaluation in progress.',
            ],
        ]);

        // Test unavailable evaluator
        $submission2 = Submission::create([
            'user_id' => $this->student->id,
            'task_id' => $this->task->id,
            'answer_text' => 'Solution 2',
            'evaluation_status' => Submission::EVAL_MANUAL_REVIEW,
            'ai_feedback' => 'AI unavailable',
            'submitted_at' => now(),
        ]);

        $response = $this->actingAs($this->student)->getJson("/api/student/submissions/{$submission2->id}");
        $response->assertOk();
        $response->assertJson([
            'data' => [
                'evaluation_status' => 'manual_review',
                'user_message' => 'Needs manual review',
            ],
        ]);

        // Test completed evaluation
        $submission3 = Submission::create([
            'user_id' => $this->student->id,
            'task_id' => $this->task->id,
            'answer_text' => 'Solution 3',
            'status' => 'evaluated',
            'evaluation_status' => 'completed',
            'is_evaluated' => true,
            'ai_score' => 90,
            'ai_feedback' => 'Great work!',
            'submitted_at' => now(),
            'evaluated_at' => now(),
        ]);

        $response = $this->actingAs($this->student)->getJson("/api/student/submissions/{$submission3->id}");
        $response->assertOk();
        $response->assertJson([
            'data' => [
                'evaluation_status' => 'completed',
                'user_message' => 'Evaluation complete',
            ],
        ]);
    }
}
