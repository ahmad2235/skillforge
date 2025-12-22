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
            'provider' => 'fake',
        ]);

        // Submission updated
        $this->assertEquals('evaluated', $submission->status);
        $this->assertTrue((bool) $submission->is_evaluated);
        $this->assertNotNull($submission->ai_feedback);
        $this->assertNotNull($submission->latest_ai_evaluation_id);

        // final_score should match ai score stored in ai_evaluations
        $aiEval = DB::table('ai_evaluations')->where('submission_id', $submission->id)->first();
        $this->assertNotNull($aiEval);
        $this->assertEquals($aiEval->score, $submission->final_score);
    }
}
