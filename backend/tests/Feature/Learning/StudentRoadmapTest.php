<?php

namespace Tests\Feature\Learning;

use App\Models\User;
use App\Modules\Learning\Infrastructure\Models\RoadmapBlock;
use App\Modules\Learning\Infrastructure\Models\Task;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StudentRoadmapTest extends TestCase
{
    use RefreshDatabase;

    public function test_student_can_view_roadmap(): void
    {
        $student = User::factory()->student()->create([
            'level' => 'beginner',
            'domain' => 'frontend',
        ]);

        RoadmapBlock::factory()->create([
            'level' => 'beginner',
            'domain' => 'frontend',
            'order_index' => 1,
        ]);

        Sanctum::actingAs($student);

        $response = $this->getJson('/api/student/roadmap');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    ['id', 'title', 'status'],
                ],
            ]);
    }

    public function test_student_can_list_tasks_for_block(): void
    {
        $student = User::factory()->student()->create([
            'level' => 'beginner',
            'domain' => 'frontend',
        ]);

        $block = RoadmapBlock::factory()->create([
            'level' => 'beginner',
            'domain' => 'frontend',
            'order_index' => 1,
        ]);

        Task::factory()->count(2)->create([
            'roadmap_block_id' => $block->id,
        ]);

        Sanctum::actingAs($student);

        $response = $this->getJson("/api/student/blocks/{$block->id}/tasks");

        $response->assertStatus(200)
            ->assertJsonCount(2, 'data');
    }
}
