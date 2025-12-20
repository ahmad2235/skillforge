<?php

namespace Tests\Feature\Assessment;

use App\Models\User;
use App\Modules\Assessment\Infrastructure\Models\PlacementResult;
use App\Modules\Assessment\Infrastructure\Models\Question;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PlacementFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_student_can_fetch_placement_questions(): void
    {
        $student = User::factory()->student()->create([
            'level' => 'beginner',
            'domain' => 'frontend',
        ]);

        Question::factory()->count(3)->create([
            'level' => 'beginner',
            'domain' => 'frontend',
        ]);

        Sanctum::actingAs($student);

        $response = $this->getJson('/api/student/assessment/placement/questions');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    ['id', 'question_text', 'domain', 'level'],
                ],
            ]);
    }

    public function test_student_can_submit_placement_answers(): void
    {
        $student = User::factory()->student()->create([
            'level' => 'beginner',
            'domain' => 'frontend',
        ]);

        $questions = Question::factory()->count(2)->create([
            'level' => 'beginner',
            'domain' => 'frontend',
        ]);

        $payload = [
            'answers' => $questions->map(fn (Question $q) => [
                'question_id' => $q->id,
                'answer' => 'Sample answer',
            ])->all(),
            'domain' => 'frontend',
        ];

        Sanctum::actingAs($student);

        $response = $this->postJson('/api/student/assessment/placement/submit', $payload);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'message',
                'data' => [
                    'placement_result_id',
                    'suggested_level',
                    'suggested_domain',
                    'recommended_blocks_count',
                ],
            ]);

        $this->assertDatabaseHas('placement_results', [
            'user_id' => $student->id,
            'final_domain' => 'frontend',
        ]);
    }

    public function test_placement_populates_roadmap_and_logs_ai_event(): void
    {
        $student = User::factory()->student()->create([
            'level' => null,
            'domain' => null,
        ]);

        $blocks = [
            \App\Modules\Learning\Infrastructure\Models\RoadmapBlock::factory()->create([
                'level' => 'beginner',
                'domain' => 'frontend',
                'order_index' => 1,
            ]),
            \App\Modules\Learning\Infrastructure\Models\RoadmapBlock::factory()->create([
                'level' => 'beginner',
                'domain' => 'frontend',
                'order_index' => 2,
            ]),
        ];

        $questions = Question::factory()->count(2)->create([
            'level' => 'beginner',
            'domain' => 'frontend',
        ]);

        $payload = [
            'answers' => $questions->map(fn (Question $q) => [
                'question_id' => $q->id,
                'answer' => 'Sample answer',
            ])->all(),
            'domain' => 'frontend',
        ];

        Sanctum::actingAs($student);

        $response = $this->postJson('/api/student/assessment/placement/submit', $payload)
            ->assertStatus(201);

        $data = $response->json('data');

        $this->assertEquals(2, $data['recommended_blocks_count']);
        $this->assertCount(2, $data['recommended_block_ids']);

        $roadmap = $this->getJson('/api/student/roadmap')
            ->assertStatus(200)
            ->json('data');

        $this->assertNotEmpty($roadmap);
        $this->assertEqualsCanonicalizing(
            collect($blocks)->pluck('id')->all(),
            array_column($roadmap, 'id')
        );

        $this->assertEquals(1, \App\Modules\AI\Infrastructure\Models\AiLog::count());
    }

    public function test_placement_unlocks_first_n_blocks(): void
    {
        $student = User::factory()->student()->create([
            'level' => null,
            'domain' => null,
        ]);

        $blocks = [
            \App\Modules\Learning\Infrastructure\Models\RoadmapBlock::factory()->create([
                'level' => 'beginner',
                'domain' => 'frontend',
                'order_index' => 1,
            ]),
            \App\Modules\Learning\Infrastructure\Models\RoadmapBlock::factory()->create([
                'level' => 'beginner',
                'domain' => 'frontend',
                'order_index' => 2,
            ]),
            \App\Modules\Learning\Infrastructure\Models\RoadmapBlock::factory()->create([
                'level' => 'beginner',
                'domain' => 'frontend',
                'order_index' => 3,
            ]),
            \App\Modules\Learning\Infrastructure\Models\RoadmapBlock::factory()->create([
                'level' => 'beginner',
                'domain' => 'frontend',
                'order_index' => 4,
            ]),
        ];

        $questions = Question::factory()->count(2)->create([
            'level' => 'beginner',
            'domain' => 'frontend',
        ]);

        $payload = [
            'answers' => $questions->map(fn (Question $q) => [
                'question_id' => $q->id,
                'answer' => 'Sample answer',
            ])->all(),
            'domain' => 'frontend',
        ];

        Sanctum::actingAs($student);

        $this->postJson('/api/student/assessment/placement/submit', $payload)
            ->assertStatus(201);

        $roadmap = $this->getJson('/api/student/roadmap')
            ->assertStatus(200)
            ->json('data');

        $this->assertNotEmpty($roadmap);

        // First 3 blocks should be 'assigned', 4th should be 'locked'
        $assignedCount = collect($roadmap)
            ->where('status', 'assigned')
            ->count();

        $lockedCount = collect($roadmap)
            ->where('status', 'locked')
            ->count();

        $this->assertGreaterThanOrEqual(3, $assignedCount, 'At least 3 blocks should be assigned after placement');
        $this->assertGreaterThanOrEqual(1, $lockedCount, 'At least 1 block should remain locked');
    }

    public function test_student_roadmap_assigns_first_blocks_when_missing_user_rows(): void
    {
        $student = User::factory()->student()->create([
            'level' => 'beginner',
            'domain' => 'frontend',
        ]);

        self::assertDatabaseCount('user_roadmap_blocks', 0);

        $blocks = [
            \App\Modules\Learning\Infrastructure\Models\RoadmapBlock::factory()->create([
                'level' => 'beginner',
                'domain' => 'frontend',
                'order_index' => 1,
            ]),
            \App\Modules\Learning\Infrastructure\Models\RoadmapBlock::factory()->create([
                'level' => 'beginner',
                'domain' => 'frontend',
                'order_index' => 2,
            ]),
            \App\Modules\Learning\Infrastructure\Models\RoadmapBlock::factory()->create([
                'level' => 'beginner',
                'domain' => 'frontend',
                'order_index' => 3,
            ]),
            \App\Modules\Learning\Infrastructure\Models\RoadmapBlock::factory()->create([
                'level' => 'beginner',
                'domain' => 'frontend',
                'order_index' => 4,
            ]),
        ];

        Sanctum::actingAs($student);

        $roadmap = $this->getJson('/api/student/roadmap')
            ->assertStatus(200)
            ->json('data');

        $this->assertNotEmpty($roadmap);

        $assignedCount = collect($roadmap)
            ->where('status', 'assigned')
            ->count();

        $lockedCount = collect($roadmap)
            ->where('status', 'locked')
            ->count();

        $this->assertGreaterThanOrEqual(1, $assignedCount, 'Roadmap should assign first blocks by default');
        $this->assertGreaterThanOrEqual(1, $lockedCount, 'Roadmap should lock remaining blocks');

        $this->assertDatabaseHas('user_roadmap_blocks', [
            'user_id' => $student->id,
            'roadmap_block_id' => $blocks[0]->id,
            'status' => 'assigned',
        ]);
    }
}
