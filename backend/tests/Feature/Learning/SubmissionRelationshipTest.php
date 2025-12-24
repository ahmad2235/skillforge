<?php

namespace Tests\Feature\Learning;

use App\Modules\Learning\Infrastructure\Models\Submission;
use App\Modules\Learning\Infrastructure\Models\AiEvaluation;
use App\Modules\Learning\Infrastructure\Models\Task;
use App\Modules\Learning\Infrastructure\Models\RoadmapBlock;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Tests\TestCase;

class SubmissionRelationshipTest extends TestCase
{
    use RefreshDatabase;

    public function test_latestAiEvaluation_is_belongs_to_relationship(): void
    {
        $user = User::factory()->create(['role' => 'student']);
        $block = RoadmapBlock::factory()->create(['level' => 'beginner', 'domain' => 'frontend']);
        $task = Task::factory()->create(['roadmap_block_id' => $block->id]);

        $submission = Submission::create([
            'user_id' => $user->id,
            'task_id' => $task->id,
            'status' => 'submitted',
        ]);

        // Verify latestAiEvaluation() returns a BelongsTo relationship instance
        $relationship = $submission->latestAiEvaluation();
        $this->assertInstanceOf(BelongsTo::class, $relationship);
    }

    public function test_latestAiEvaluationResolved_with_pointer_set(): void
    {
        $user = User::factory()->create(['role' => 'student']);
        $block = RoadmapBlock::factory()->create(['level' => 'beginner', 'domain' => 'frontend']);
        $task = Task::factory()->create(['roadmap_block_id' => $block->id]);

        $submission = Submission::create([
            'user_id' => $user->id,
            'task_id' => $task->id,
            'status' => 'submitted',
        ]);

        // Create first evaluation
        $eval1 = AiEvaluation::create([
            'submission_id' => $submission->id,
            'status' => 'succeeded',
            'score' => 80,
            'completed_at' => now()->subMinutes(10),
        ]);

        // Create second evaluation (more recent)
        $eval2 = AiEvaluation::create([
            'submission_id' => $submission->id,
            'status' => 'succeeded',
            'score' => 90,
            'completed_at' => now(),
        ]);

        // Set pointer to eval1 (older)
        $submission->latest_ai_evaluation_id = $eval1->id;
        $submission->save();

        // Should return eval1 because pointer is set
        $resolved = $submission->latestAiEvaluationResolved();
        $this->assertNotNull($resolved);
        $this->assertEquals($eval1->id, $resolved->id);
        $this->assertEquals(80, $resolved->score);
    }

    public function test_latestAiEvaluationResolved_without_pointer_fallback(): void
    {
        $user = User::factory()->create(['role' => 'student']);
        $block = RoadmapBlock::factory()->create(['level' => 'beginner', 'domain' => 'frontend']);
        $task = Task::factory()->create(['roadmap_block_id' => $block->id]);

        $submission = Submission::create([
            'user_id' => $user->id,
            'task_id' => $task->id,
            'status' => 'submitted',
        ]);

        // Create evaluations without setting pointer
        $eval1 = AiEvaluation::create([
            'submission_id' => $submission->id,
            'status' => 'succeeded',
            'score' => 70,
            'completed_at' => now()->subMinutes(10),
            'created_at' => now()->subMinutes(10),
        ]);

        $eval2 = AiEvaluation::create([
            'submission_id' => $submission->id,
            'status' => 'succeeded',
            'score' => 95,
            'completed_at' => now(), // Most recent
            'created_at' => now(),
        ]);

        // Pointer is null, should fallback to most recent by completed_at
        $this->assertNull($submission->latest_ai_evaluation_id);
        $resolved = $submission->latestAiEvaluationResolved();
        $this->assertNotNull($resolved);
        $this->assertEquals($eval2->id, $resolved->id);
        $this->assertEquals(95, $resolved->score);
    }

    public function test_latestAiEvaluationResolved_returns_null_when_no_evaluations(): void
    {
        $user = User::factory()->create(['role' => 'student']);
        $block = RoadmapBlock::factory()->create(['level' => 'beginner', 'domain' => 'frontend']);
        $task = Task::factory()->create(['roadmap_block_id' => $block->id]);

        $submission = Submission::create([
            'user_id' => $user->id,
            'task_id' => $task->id,
            'status' => 'submitted',
        ]);

        // No evaluations exist
        $resolved = $submission->latestAiEvaluationResolved();
        $this->assertNull($resolved);
    }
}
