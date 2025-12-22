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
 * Phase 9: Skills + Rubrics + Consistent Scoring Tests
 *
 * Tests for the new skills, rubrics, and scoring enhancements.
 */
class Phase9SkillsRubricsTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $student;
    private RoadmapBlock $block;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create(['role' => 'admin']);
        $this->student = User::factory()->create([
            'role' => 'student',
            'level' => 'beginner',
            'domain' => 'frontend',
        ]);
        $this->block = RoadmapBlock::factory()->create([
            'level' => 'beginner',
            'domain' => 'frontend',
            'order_index' => 1,
        ]);
    }

    // ========================================
    // Skills Tests
    // ========================================

    public function test_skill_can_be_created(): void
    {
        $skill = Skill::create([
            'code' => 'test-skill',
            'name' => 'Test Skill',
            'description' => 'A test skill',
            'domain' => 'frontend',
            'level' => 'beginner',
            'is_active' => true,
        ]);

        $this->assertDatabaseHas('skills', [
            'code' => 'test-skill',
            'name' => 'Test Skill',
            'domain' => 'frontend',
            'level' => 'beginner',
        ]);

        $this->assertTrue($skill->is_active);
    }

    public function test_skill_code_is_unique(): void
    {
        Skill::create([
            'code' => 'unique-skill',
            'name' => 'First Skill',
            'domain' => 'frontend',
            'level' => 'beginner',
        ]);

        $this->expectException(\Illuminate\Database\QueryException::class);

        Skill::create([
            'code' => 'unique-skill', // duplicate
            'name' => 'Second Skill',
            'domain' => 'backend',
            'level' => 'advanced',
        ]);
    }

    public function test_skill_scopes_work_correctly(): void
    {
        Skill::create(['code' => 'fe-beg-1', 'name' => 'FE Beg 1', 'domain' => 'frontend', 'level' => 'beginner', 'is_active' => true]);
        Skill::create(['code' => 'fe-adv-1', 'name' => 'FE Adv 1', 'domain' => 'frontend', 'level' => 'advanced', 'is_active' => true]);
        Skill::create(['code' => 'be-beg-1', 'name' => 'BE Beg 1', 'domain' => 'backend', 'level' => 'beginner', 'is_active' => false]);

        $this->assertCount(2, Skill::forDomain('frontend')->get());
        $this->assertCount(2, Skill::forLevel('beginner')->get());
        $this->assertCount(2, Skill::active()->get());
        $this->assertCount(1, Skill::forDomain('frontend')->forLevel('beginner')->active()->get());
    }

    // ========================================
    // Task with Skill & Rubric Tests
    // ========================================

    public function test_task_can_have_skill(): void
    {
        $skill = Skill::create([
            'code' => 'html-basics',
            'name' => 'HTML Basics',
            'domain' => 'frontend',
            'level' => 'beginner',
        ]);

        $task = Task::create([
            'roadmap_block_id' => $this->block->id,
            'title' => 'Build HTML Page',
            'description' => 'Create a simple HTML page',
            'type' => 'coding',
            'difficulty' => 2,
            'max_score' => 100,
            'skill_id' => $skill->id,
        ]);

        $this->assertEquals($skill->id, $task->skill_id);
        $this->assertEquals('HTML Basics', $task->skill->name);
    }

    public function test_task_can_have_rubric(): void
    {
        $rubric = [
            ['criterion' => 'Structure', 'max_points' => 30, 'description' => 'Proper HTML structure'],
            ['criterion' => 'Semantics', 'max_points' => 20, 'description' => 'Use of semantic tags'],
            ['criterion' => 'Validity', 'max_points' => 50, 'description' => 'Valid HTML5 markup'],
        ];

        $task = Task::create([
            'roadmap_block_id' => $this->block->id,
            'title' => 'HTML Task with Rubric',
            'description' => 'Build an HTML page',
            'type' => 'coding',
            'difficulty' => 3,
            'max_score' => 100,
            'rubric' => $rubric,
            'weight' => 2,
        ]);

        $this->assertIsArray($task->rubric);
        $this->assertCount(3, $task->rubric);
        $this->assertEquals('Structure', $task->rubric[0]['criterion']);
        $this->assertEquals(30, $task->rubric[0]['max_points']);
        $this->assertEquals(2, $task->weight);
    }

    public function test_admin_can_create_task_with_skill_and_rubric(): void
    {
        $skill = Skill::create([
            'code' => 'css-basics',
            'name' => 'CSS Basics',
            'domain' => 'frontend',
            'level' => 'beginner',
        ]);

        $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/admin/learning/blocks/{$this->block->id}/tasks", [
                'title' => 'CSS Styling Task',
                'description' => 'Style a webpage',
                'type' => 'coding',
                'difficulty' => 2,
                'max_score' => 100,
                'skill_id' => $skill->id,
                'rubric' => [
                    ['criterion' => 'Selectors', 'max_points' => 40, 'description' => 'Proper CSS selectors'],
                    ['criterion' => 'Layout', 'max_points' => 60, 'description' => 'Correct layout'],
                ],
                'weight' => 3,
            ])
            ->assertStatus(201)
            ->assertJsonPath('data.skill_id', $skill->id)
            ->assertJsonPath('data.weight', 3);

        $this->assertDatabaseHas('tasks', [
            'title' => 'CSS Styling Task',
            'skill_id' => $skill->id,
            'weight' => 3,
        ]);
    }

    public function test_admin_can_update_task_skill_and_rubric(): void
    {
        $task = Task::factory()->create([
            'roadmap_block_id' => $this->block->id,
            'skill_id' => null,
            'rubric' => null,
            'weight' => 1,
        ]);

        $skill = Skill::create([
            'code' => 'js-basics',
            'name' => 'JavaScript Basics',
            'domain' => 'frontend',
            'level' => 'beginner',
        ]);

        $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/admin/learning/tasks/{$task->id}", [
                'skill_id' => $skill->id,
                'rubric' => [
                    ['criterion' => 'Variables', 'max_points' => 50],
                    ['criterion' => 'Functions', 'max_points' => 50],
                ],
                'weight' => 5,
            ])
            ->assertStatus(200);

        $task->refresh();
        $this->assertEquals($skill->id, $task->skill_id);
        $this->assertCount(2, $task->rubric);
        $this->assertEquals(5, $task->weight);
    }

    // ========================================
    // Student Task View Tests
    // ========================================

    public function test_student_task_show_includes_skill_and_rubric(): void
    {
        $skill = Skill::create([
            'code' => 'html-forms',
            'name' => 'HTML Forms',
            'domain' => 'frontend',
            'level' => 'beginner',
        ]);

        $task = Task::create([
            'roadmap_block_id' => $this->block->id,
            'title' => 'Form Task',
            'description' => 'Build a form',
            'type' => 'coding',
            'difficulty' => 2,
            'max_score' => 100,
            'skill_id' => $skill->id,
            'rubric' => [
                ['criterion' => 'Inputs', 'max_points' => 50],
                ['criterion' => 'Validation', 'max_points' => 50],
            ],
            'weight' => 2,
        ]);

        $this->actingAs($this->student, 'sanctum')
            ->getJson("/api/student/tasks/{$task->id}")
            ->assertStatus(200)
            ->assertJsonPath('data.skill_id', $skill->id)
            ->assertJsonPath('data.weight', 2)
            ->assertJsonStructure([
                'data' => [
                    'id', 'title', 'description', 'type', 'difficulty',
                    'max_score', 'skill_id', 'rubric', 'weight',
                ],
            ]);
    }

    // ========================================
    // Submission Scoring Tests
    // ========================================

    public function test_submission_has_new_scoring_fields(): void
    {
        $task = Task::factory()->create(['roadmap_block_id' => $this->block->id]);

        $submission = Submission::create([
            'user_id' => $this->student->id,
            'task_id' => $task->id,
            'answer_text' => 'My answer',
            'status' => 'evaluated',
            'score' => 85.0, // legacy
            'final_score' => 90.5, // Phase 9
            'rubric_scores' => [
                ['criterion' => 'Structure', 'score' => 28, 'max_points' => 30],
                ['criterion' => 'Semantics', 'score' => 18, 'max_points' => 20],
                ['criterion' => 'Validity', 'score' => 44, 'max_points' => 50],
            ],
            'evaluated_by' => 'system',
            'is_evaluated' => true,
        ]);

        $this->assertEquals(90.5, $submission->final_score);
        $this->assertIsArray($submission->rubric_scores);
        $this->assertCount(3, $submission->rubric_scores);
        $this->assertEquals('system', $submission->evaluated_by);
    }

    public function test_effective_score_prefers_final_score(): void
    {
        $task = Task::factory()->create(['roadmap_block_id' => $this->block->id]);

        // Case 1: Both scores present - final_score wins
        $submission1 = Submission::create([
            'user_id' => $this->student->id,
            'task_id' => $task->id,
            'answer_text' => 'Answer 1',
            'status' => 'evaluated',
            'score' => 70.0,
            'final_score' => 85.0,
        ]);
        $this->assertEquals(85.0, $submission1->effective_score);

        // Case 2: Only legacy score - fallback to score
        $submission2 = Submission::create([
            'user_id' => $this->student->id,
            'task_id' => $task->id,
            'answer_text' => 'Answer 2',
            'status' => 'evaluated',
            'score' => 75.0,
            'final_score' => null,
        ]);
        $this->assertEquals(75.0, $submission2->effective_score);

        // Case 3: No scores
        $submission3 = Submission::create([
            'user_id' => $this->student->id,
            'task_id' => $task->id,
            'answer_text' => 'Answer 3',
            'status' => 'submitted',
            'score' => null,
            'final_score' => null,
        ]);
        $this->assertNull($submission3->effective_score);
    }

    public function test_student_submission_response_includes_new_fields(): void
    {
        $task = Task::factory()->create(['roadmap_block_id' => $this->block->id]);

        $submission = Submission::create([
            'user_id' => $this->student->id,
            'task_id' => $task->id,
            'answer_text' => 'Test submission',
            'status' => 'evaluated',
            'score' => 80,
            'final_score' => 88.5,
            'rubric_scores' => [
                ['criterion' => 'Quality', 'score' => 45, 'max_points' => 50],
            ],
            'evaluated_by' => 'admin',
            'is_evaluated' => true,
        ]);

        $this->actingAs($this->student, 'sanctum')
            ->getJson("/api/student/submissions/{$submission->id}")
            ->assertStatus(200)
            ->assertJsonPath('data.final_score', 88.5)
            ->assertJsonPath('data.evaluated_by', 'admin')
            ->assertJsonPath('data.effective_score', 88.5)
            ->assertJsonStructure([
                'data' => [
                    'id', 'task_id', 'status', 'score',
                    'final_score', 'rubric_scores', 'evaluated_by', 'effective_score',
                ],
            ]);
    }

    // ========================================
    // Backward Compatibility Tests
    // ========================================

    public function test_existing_task_without_skill_works(): void
    {
        $task = Task::factory()->create([
            'roadmap_block_id' => $this->block->id,
            'skill_id' => null,
            'rubric' => null,
            'weight' => 1, // Default weight, not null
        ]);

        $this->actingAs($this->student, 'sanctum')
            ->getJson("/api/student/tasks/{$task->id}")
            ->assertStatus(200)
            ->assertJsonPath('data.skill_id', null)
            ->assertJsonPath('data.rubric', null);
    }

    public function test_submission_without_new_fields_works(): void
    {
        $task = Task::factory()->create(['roadmap_block_id' => $this->block->id]);

        $submission = Submission::create([
            'user_id' => $this->student->id,
            'task_id' => $task->id,
            'answer_text' => 'Legacy submission',
            'status' => 'evaluated',
            'score' => 75.0,
            // No final_score, rubric_scores, evaluated_by
        ]);

        $this->assertEquals(75.0, $submission->effective_score);
        $this->assertNull($submission->final_score);
        $this->assertNull($submission->rubric_scores);
        $this->assertNull($submission->evaluated_by);
    }

    public function test_student_submit_still_works(): void
    {
        $task = Task::factory()->create([
            'roadmap_block_id' => $this->block->id,
        ]);

        $this->actingAs($this->student, 'sanctum')
            ->postJson("/api/student/tasks/{$task->id}/submit", [
                'answer_text' => 'My solution for Phase 9',
            ])
            ->assertStatus(201)
            ->assertJsonFragment(['message' => 'Task submitted successfully.']);

        $this->assertDatabaseHas('submissions', [
            'user_id' => $this->student->id,
            'task_id' => $task->id,
            'answer_text' => 'My solution for Phase 9',
        ]);
    }

    // ========================================
    // Validation Tests
    // ========================================

    public function test_rubric_validation_requires_criterion(): void
    {
        $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/admin/learning/blocks/{$this->block->id}/tasks", [
                'title' => 'Invalid Rubric Task',
                'description' => 'Test',
                'type' => 'coding',
                'difficulty' => 2,
                'max_score' => 100,
                'rubric' => [
                    ['max_points' => 50], // missing criterion
                ],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['rubric.0.criterion']);
    }

    public function test_rubric_validation_requires_max_points(): void
    {
        $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/admin/learning/blocks/{$this->block->id}/tasks", [
                'title' => 'Invalid Rubric Task',
                'description' => 'Test',
                'type' => 'coding',
                'difficulty' => 2,
                'max_score' => 100,
                'rubric' => [
                    ['criterion' => 'Test'], // missing max_points
                ],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['rubric.0.max_points']);
    }

    public function test_skill_id_must_exist(): void
    {
        $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/admin/learning/blocks/{$this->block->id}/tasks", [
                'title' => 'Invalid Skill Task',
                'description' => 'Test',
                'type' => 'coding',
                'difficulty' => 2,
                'max_score' => 100,
                'skill_id' => 99999, // doesn't exist
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['skill_id']);
    }

    public function test_weight_must_be_in_range(): void
    {
        $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/admin/learning/blocks/{$this->block->id}/tasks", [
                'title' => 'Invalid Weight Task',
                'description' => 'Test',
                'type' => 'coding',
                'difficulty' => 2,
                'max_score' => 100,
                'weight' => 150, // > 100
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['weight']);
    }
}
