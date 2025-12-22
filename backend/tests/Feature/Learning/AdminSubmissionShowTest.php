<?php

namespace Tests\Feature\Learning;

use App\Modules\Learning\Infrastructure\Models\AiEvaluation;
use App\Modules\Learning\Infrastructure\Models\Submission;
use App\Modules\Learning\Infrastructure\Models\Task;
use App\Modules\Learning\Infrastructure\Models\RoadmapBlock;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminSubmissionShowTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_fetch_submission_with_latest_ai_evaluation(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $student = User::factory()->create(['role' => 'student']);

        $block = RoadmapBlock::factory()->create([ 'level' => 'beginner', 'domain' => 'frontend', 'order_index' => 1 ]);
        $task = Task::factory()->create(['roadmap_block_id' => $block->id, 'rubric' => null]);

        $submission = Submission::create([
            'user_id' => $student->id,
            'task_id' => $task->id,
            'answer_text' => 'test',
            'status' => 'evaluated',
            'final_score' => 80,
            'evaluated_by' => 'system',
            'submitted_at' => now(),
            'evaluated_at' => now(),
        ]);

        $ai = AiEvaluation::create([
            'submission_id' => $submission->id,
            'provider' => 'fake',
            'model' => 'fake-model',
            'status' => 'succeeded',
            'score' => 80,
            'feedback' => 'auto',
            'metadata' => ['model' => 'fake-model'],
            'started_at' => now(),
            'completed_at' => now(),
        ]);

        // Link latest evaluation id
        $submission->update(['latest_ai_evaluation_id' => $ai->id]);

        $this->actingAs($admin, 'sanctum')
            ->getJson("/api/admin/learning/submissions/{$submission->id}")
            ->assertStatus(200)
            ->assertJsonPath('data.latest_ai_evaluation.id', $ai->id)
            ->assertJsonPath('data.final_score', 80);
    }
}
