<?php

namespace Tests\Feature\Learning;

use App\Models\User;
use App\Modules\Learning\Application\Services\AiEvaluationService;
use App\Modules\Learning\Infrastructure\Models\AiEvaluation;
use App\Modules\Learning\Infrastructure\Models\RoadmapBlock;
use App\Modules\Learning\Infrastructure\Models\Submission;
use App\Modules\Learning\Infrastructure\Models\Task;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * Tests for hybrid AI evaluation storage system:
 * - ai_evaluations table (append-only history)
 * - submissions table (latest snapshot)
 */
class AiEvaluationStorageTest extends TestCase
{
    use RefreshDatabase;

    private AiEvaluationService $service;
    private User $student;
    private Task $task;
    private Submission $submission;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = new AiEvaluationService();

        $this->student = User::factory()->create([
            'role' => 'student',
            'level' => 'beginner',
            'domain' => 'frontend',
        ]);

        $block = RoadmapBlock::factory()->create([
            'level' => 'beginner',
            'domain' => 'frontend',
            'order_index' => 1,
        ]);

        $this->task = Task::create([
            'roadmap_block_id' => $block->id,
            'title' => 'HTML Forms Task',
            'description' => 'Build a contact form',
            'type' => 'coding',
            'difficulty' => 2,
            'max_score' => 100,
            'rubric' => [
                ['criterion' => 'Form Structure', 'max_points' => 40],
                ['criterion' => 'Input Validation', 'max_points' => 30],
                ['criterion' => 'Styling', 'max_points' => 30],
            ],
            'weight' => 2,
        ]);

        $this->submission = Submission::create([
            'user_id' => $this->student->id,
            'task_id' => $this->task->id,
            'answer_text' => '<form><input type="text" name="email" /></form>',
            'status' => 'submitted',
        ]);
    }

    /**
     * Test 1: AI evaluation creates history record and updates submission snapshot.
     */
    public function test_ai_evaluation_creates_history_and_updates_snapshot(): void
    {
        $evaluationData = [
            'provider' => 'openai',
            'model' => 'gpt-4',
            'prompt_version' => 'v1.0',
            'score' => 85.5,
            'feedback' => 'Good form structure. Consider adding labels.',
            'rubric_scores' => [
                ['criterion' => 'Form Structure', 'score' => 35, 'max_points' => 40],
                ['criterion' => 'Input Validation', 'score' => 25, 'max_points' => 30],
                ['criterion' => 'Styling', 'score' => 25, 'max_points' => 30],
            ],
            'metadata' => ['tokens_used' => 150, 'response_time_ms' => 1200],
        ];

        $aiEvaluation = $this->service->recordEvaluation($this->submission, $evaluationData);

        // Assert: AI evaluation record created
        $this->assertInstanceOf(AiEvaluation::class, $aiEvaluation);
        $this->assertEquals($this->submission->id, $aiEvaluation->submission_id);
        $this->assertEquals('openai', $aiEvaluation->provider);
        $this->assertEquals('gpt-4', $aiEvaluation->model);
        $this->assertEquals('v1.0', $aiEvaluation->prompt_version);
        $this->assertEquals('succeeded', $aiEvaluation->status);
        $this->assertEquals(85.5, $aiEvaluation->score);
        $this->assertEquals('Good form structure. Consider adding labels.', $aiEvaluation->feedback);
        $this->assertIsArray($aiEvaluation->rubric_scores);
        $this->assertCount(3, $aiEvaluation->rubric_scores);
        $this->assertNotNull($aiEvaluation->started_at);
        $this->assertNotNull($aiEvaluation->completed_at);

        // Assert: Submission snapshot updated
        $this->submission->refresh();
        $this->assertEquals(85, $this->submission->ai_score); // Cast to int
        $this->assertEquals('Good form structure. Consider adding labels.', $this->submission->ai_feedback);
        $this->assertEquals(85.5, $this->submission->final_score);
        $this->assertIsArray($this->submission->rubric_scores);
        $this->assertEquals('system', $this->submission->evaluated_by);
        $this->assertTrue($this->submission->is_evaluated);
        $this->assertEquals('evaluated', $this->submission->status);
        $this->assertNotNull($this->submission->evaluated_at);

        // Assert: latest_ai_evaluation_id set (if column exists)
        if (Schema::hasColumn('submissions', 'latest_ai_evaluation_id')) {
            $this->assertEquals($aiEvaluation->id, $this->submission->latest_ai_evaluation_id);
        }

        // Assert: Database records exist
        $this->assertDatabaseHas('ai_evaluations', [
            'submission_id' => $this->submission->id,
            'provider' => 'openai',
            'status' => 'succeeded',
            'score' => 85.5,
        ]);

        $this->assertDatabaseHas('submissions', [
            'id' => $this->submission->id,
            'final_score' => 85.5,
            'evaluated_by' => 'system',
            'is_evaluated' => true,
        ]);
    }

    /**
     * Test 2: Multiple AI evaluations create history (append-only).
     */
    public function test_multiple_evaluations_create_append_only_history(): void
    {
        // First evaluation
        $this->service->recordEvaluation($this->submission, [
            'provider' => 'openai',
            'model' => 'gpt-4',
            'score' => 75.0,
            'feedback' => 'First attempt feedback',
        ]);

        // Second evaluation (e.g., re-evaluation with different prompt)
        $this->service->recordEvaluation($this->submission, [
            'provider' => 'openai',
            'model' => 'gpt-4-turbo',
            'score' => 85.0,
            'feedback' => 'Second attempt feedback',
        ]);

        // Third evaluation
        $aiEval3 = $this->service->recordEvaluation($this->submission, [
            'provider' => 'anthropic',
            'model' => 'claude-3',
            'score' => 90.0,
            'feedback' => 'Third attempt feedback',
        ]);

        // Assert: 3 evaluation records exist
        $this->assertEquals(3, AiEvaluation::where('submission_id', $this->submission->id)->count());

        // Assert: Submission snapshot has latest values
        $this->submission->refresh();
        $this->assertEquals(90.0, $this->submission->final_score);
        $this->assertEquals('Third attempt feedback', $this->submission->ai_feedback);

        // Assert: latest_ai_evaluation_id points to most recent
        if (Schema::hasColumn('submissions', 'latest_ai_evaluation_id')) {
            $this->assertEquals($aiEval3->id, $this->submission->latest_ai_evaluation_id);
        }

        // Assert: Can retrieve full history
        $history = $this->service->getEvaluationHistory($this->submission);
        $this->assertCount(3, $history);
        $this->assertEquals(90.0, $history[0]->score); // Most recent first
        $this->assertEquals(85.0, $history[1]->score);
        $this->assertEquals(75.0, $history[2]->score);
    }

    /**
     * Test 3: Failed evaluation is recorded.
     */
    public function test_failed_evaluation_is_recorded(): void
    {
        $failedEval = $this->service->recordFailure(
            $this->submission,
            'API rate limit exceeded',
            ['provider' => 'openai', 'model' => 'gpt-4']
        );

        $this->assertEquals('failed', $failedEval->status);
        $this->assertEquals('API rate limit exceeded', $failedEval->error_message);
        $this->assertNotNull($failedEval->completed_at);

        $this->assertDatabaseHas('ai_evaluations', [
            'submission_id' => $this->submission->id,
            'status' => 'failed',
            'error_message' => 'API rate limit exceeded',
        ]);

        // Assert: Submission snapshot NOT updated on failure
        $this->submission->refresh();
        $this->assertNull($this->submission->final_score);
        $this->assertEquals('submitted', $this->submission->status);
    }

    /**
     * Test 4: Relationships work correctly.
     */
    public function test_relationships_work_correctly(): void
    {
        $aiEval = $this->service->recordEvaluation($this->submission, [
            'score' => 80.0,
            'feedback' => 'Test feedback',
        ]);

        // Submission -> AiEvaluations (hasMany)
        $this->submission->refresh();
        $this->assertCount(1, $this->submission->aiEvaluations);
        $this->assertEquals($aiEval->id, $this->submission->aiEvaluations->first()->id);

        // Submission -> latestAiEvaluation (belongsTo)
        if (Schema::hasColumn('submissions', 'latest_ai_evaluation_id')) {
            $this->assertNotNull($this->submission->latestAiEvaluation);
            $this->assertEquals($aiEval->id, $this->submission->latestAiEvaluation->id);
        }

        // AiEvaluation -> Submission (belongsTo)
        $this->assertEquals($this->submission->id, $aiEval->submission->id);
    }

    /**
     * Test 5: Effective score accessor still works.
     */
    public function test_effective_score_accessor_works_with_ai_evaluations(): void
    {
        // Before evaluation
        $this->assertNull($this->submission->effective_score);

        // After AI evaluation
        $this->service->recordEvaluation($this->submission, [
            'score' => 88.5,
            'feedback' => 'Great work',
        ]);

        $this->submission->refresh();
        $this->assertEquals(88.5, $this->submission->effective_score);
        $this->assertEquals(88.5, $this->submission->final_score);
    }

    /**
     * Test 6: Scopes on AiEvaluation model work.
     */
    public function test_ai_evaluation_scopes_work(): void
    {
        // Create succeeded evaluation
        $this->service->recordEvaluation($this->submission, [
            'score' => 85.0,
        ]);

        // Create failed evaluation
        $this->service->recordFailure($this->submission, 'Timeout error');

        // Test scopes
        $this->assertEquals(1, AiEvaluation::succeeded()->count());
        $this->assertEquals(1, AiEvaluation::failed()->count());
        $this->assertEquals(1, AiEvaluation::withStatus('succeeded')->count());
        $this->assertEquals(1, AiEvaluation::withStatus('failed')->count());
    }
}
