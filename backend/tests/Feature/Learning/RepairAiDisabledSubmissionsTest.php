<?php

namespace Tests\Feature\Learning;

use App\Modules\Learning\Infrastructure\Models\AiEvaluation;
use App\Modules\Learning\Infrastructure\Models\Submission;
use App\Modules\Learning\Infrastructure\Models\Task;
use App\Modules\Learning\Infrastructure\Models\RoadmapBlock;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class RepairAiDisabledSubmissionsTest extends TestCase
{
    use RefreshDatabase;

    public function test_repair_command_repairs_succeeded_evals_with_ai_disabled_true(): void
    {
        $user = User::factory()->create(['role' => 'student']);
        $block = RoadmapBlock::factory()->create([ 'level' => 'beginner', 'domain' => 'frontend', 'order_index' => 1 ]);
        $task = Task::factory()->create(['roadmap_block_id' => $block->id]);

        // Create a submission that was incorrectly marked evaluated with ai score 0
        $submission = Submission::create([
            'user_id' => $user->id,
            'task_id' => $task->id,
            'status' => 'evaluated',
            'ai_score' => 0,
            'final_score' => 0.00,
            'is_evaluated' => true,
            'submitted_at' => now(),
            'evaluated_at' => now(),
        ]);

        // Create a bad ai_evaluation row (succeeded) with ai_disabled true in metadata
        $meta = ['ai_disabled' => true, 'reason' => 'ai_disabled'];
        $ae = AiEvaluation::create([
            'submission_id' => $submission->id,
            'provider' => 'openai',
            'status' => 'succeeded',
            'score' => 0,
            'feedback' => 'Fallback score 0',
            'metadata' => $meta,
            'started_at' => now(),
            'completed_at' => now(),
        ]);

        // Point submission to latest evaluation
        $submission->latest_ai_evaluation_id = $ae->id;
        $submission->save();

        // Dry run: should report the offending submission
        $this->artisan('ai:repair-disabled-submissions', ['--dry-run' => true])
            ->expectsOutput("Running in DRY RUN mode - no changes will be made.")
            ->assertExitCode(0);

        // Ensure nothing changed yet
        $submission->refresh();
        $ae->refresh();
        $this->assertEquals('evaluated', $submission->status);
        $this->assertEquals('succeeded', $ae->status);

        // Run actual repair
        $this->artisan('ai:repair-disabled-submissions')
            ->assertExitCode(0);

        // Reload
        $submission->refresh();
        $ae->refresh();

        // Submission must now be needs_manual_review and scores null
        $this->assertEquals('needs_manual_review', $submission->status);
        $this->assertNull($submission->ai_score);
        $this->assertNull($submission->final_score);
        $this->assertNull($submission->rubric_scores);
        $this->assertFalse((bool) $submission->is_evaluated);
        $this->assertNull($submission->evaluated_at);

        // ai_evaluation status must be failed and metadata adjusted
        $this->assertEquals('failed', $ae->status);
        $meta = json_decode($ae->metadata, true);
        $this->assertEquals('manual_review', $meta['evaluation_outcome']);
        $this->assertEquals('ai_disabled', $meta['reason']);
    }
}
