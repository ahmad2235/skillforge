<?php

namespace Tests\Feature\Learning;

use App\Models\User;
use App\Modules\Learning\Infrastructure\Models\RoadmapBlock;
use App\Modules\Learning\Infrastructure\Models\Skill;
use App\Modules\Learning\Infrastructure\Models\Submission;
use App\Modules\Learning\Infrastructure\Models\Task;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Phase 9: Minimal stable tests for Skills + Rubrics + Scoring.
 * 
 * These tests verify core Phase 9 functionality with minimal dependencies.
 */
class Phase9MinimalTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test 1: Task show endpoint returns Phase 9 fields (skill_id, rubric, weight).
     */
    public function test_task_show_returns_phase9_fields(): void
    {
        // Create student matching block's level/domain
        $student = User::factory()->create([
            'role' => 'student',
            'level' => 'beginner',
            'domain' => 'frontend',
        ]);

        $block = RoadmapBlock::factory()->create([
            'level' => 'beginner',
            'domain' => 'frontend',
            'order_index' => 1,
        ]);

        $skill = Skill::create([
            'code' => 'html-test',
            'name' => 'HTML Test',
            'domain' => 'frontend',
            'level' => 'beginner',
        ]);

        $task = Task::create([
            'roadmap_block_id' => $block->id,
            'title' => 'Test Task',
            'description' => 'A test task',
            'type' => 'coding',
            'difficulty' => 2,
            'max_score' => 100,
            'skill_id' => $skill->id,
            'rubric' => [
                ['criterion' => 'Structure', 'max_points' => 50],
                ['criterion' => 'Style', 'max_points' => 50],
            ],
            'weight' => 3,
        ]);

        $response = $this->actingAs($student, 'sanctum')
            ->getJson("/api/student/tasks/{$task->id}");

        $response->assertStatus(200)
            ->assertJsonPath('data.skill_id', $skill->id)
            ->assertJsonPath('data.weight', 3)
            ->assertJsonStructure([
                'data' => [
                    'id', 'title', 'description', 'type', 'difficulty',
                    'max_score', 'skill_id', 'rubric', 'weight',
                ],
            ]);

        // Verify rubric is returned as array
        $this->assertIsArray($response->json('data.rubric'));
        $this->assertCount(2, $response->json('data.rubric'));
    }

    /**
     * Test 2: Submission effective_score prefers final_score over legacy score.
     */
    public function test_submission_effective_score_prefers_final_score(): void
    {
        $student = User::factory()->create([
            'role' => 'student',
            'level' => 'beginner',
            'domain' => 'frontend',
        ]);

        $block = RoadmapBlock::factory()->create([
            'level' => 'beginner',
            'domain' => 'frontend',
            'order_index' => 1,
        ]);

        $task = Task::factory()->create([
            'roadmap_block_id' => $block->id,
        ]);

        // Case 1: Both scores present - final_score wins
        $submission1 = Submission::create([
            'user_id' => $student->id,
            'task_id' => $task->id,
            'answer_text' => 'Answer with both scores',
            'status' => 'evaluated',
            'score' => 70.0,        // legacy
            'final_score' => 85.5,  // Phase 9
        ]);
        $this->assertEquals(85.5, $submission1->effective_score);

        // Case 2: Only legacy score - fallback
        $submission2 = Submission::create([
            'user_id' => $student->id,
            'task_id' => $task->id,
            'answer_text' => 'Answer with legacy score only',
            'status' => 'evaluated',
            'score' => 75.0,
            'final_score' => null,
        ]);
        $this->assertEquals(75.0, $submission2->effective_score);

        // Case 3: No scores
        $submission3 = Submission::create([
            'user_id' => $student->id,
            'task_id' => $task->id,
            'answer_text' => 'Answer with no scores',
            'status' => 'submitted',
            'score' => null,
            'final_score' => null,
        ]);
        $this->assertNull($submission3->effective_score);
    }
}
