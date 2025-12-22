<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Learning\Infrastructure\Models\RoadmapBlock;
use App\Modules\Learning\Infrastructure\Models\Task;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StudentTaskShowTest extends TestCase
{
    use RefreshDatabase;

    public function test_student_can_fetch_existing_task()
    {
        // Create student user
        $student = User::factory()->create([
            'role' => 'student',
            'level' => 'beginner',
            'domain' => 'frontend',
        ]);

        // Create a block matching student
        $block = RoadmapBlock::create([
            'level' => 'beginner',
            'domain' => 'frontend',
            'title' => 'Demo Block',
            'description' => 'Demo',
            'order_index' => 1,
            'estimated_hours' => 3,
            'is_optional' => false,
        ]);

        $task = Task::create([
            'roadmap_block_id' => $block->id,
            'title' => 'Demo Task',
            'description' => 'Task desc',
            'type' => 'coding',
            'difficulty' => 2,
            'max_score' => 100,
            'metadata' => [],
        ]);

        $this->actingAs($student, 'sanctum')
            ->getJson("/api/student/tasks/{$task->id}")
            ->assertStatus(200)
            ->assertJsonStructure(['data' => ['id', 'title', 'description', 'type', 'difficulty', 'max_score', 'metadata', 'roadmap_block_id']])
            ->assertJsonPath('data.id', $task->id);
    }

    public function test_student_gets_404_for_nonexistent_task()
    {
        $student = User::factory()->create();

        $this->actingAs($student, 'sanctum')
            ->getJson('/api/student/tasks/99999')
            ->assertStatus(404);
    }

    public function test_student_cannot_access_task_of_other_level()
    {
        $student = User::factory()->create([
            'role' => 'student',
            'level' => 'beginner',
            'domain' => 'frontend',
        ]);

        $block = RoadmapBlock::create([
            'level' => 'advanced',
            'domain' => 'backend',
            'title' => 'Advanced Block',
            'description' => 'Advanced',
            'order_index' => 1,
            'estimated_hours' => 10,
            'is_optional' => false,
        ]);

        $task = Task::create([
            'roadmap_block_id' => $block->id,
            'title' => 'Advanced Task',
            'description' => 'Advanced desc',
            'type' => 'project',
            'difficulty' => 5,
            'max_score' => 100,
            'metadata' => [],
        ]);

        $this->actingAs($student, 'sanctum')
            ->getJson("/api/student/tasks/{$task->id}")
            ->assertStatus(403);
    }
}
