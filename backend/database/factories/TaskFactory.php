<?php

namespace Database\Factories;

use App\Modules\Learning\Infrastructure\Models\Task;
use App\Modules\Learning\Infrastructure\Models\RoadmapBlock;
use Illuminate\Database\Eloquent\Factories\Factory;

class TaskFactory extends Factory
{
    protected $model = Task::class;

    public function definition(): array
    {
        return [
            'roadmap_block_id' => RoadmapBlock::factory(),
            'title' => $this->faker->sentence(3),
            'description' => $this->faker->paragraph(1),
            'type' => 'coding',
            'difficulty' => 1,
            'max_score' => 100,
            'metadata' => ['starter' => 'console.log("hello")'],
            'is_active' => true,
        ];
    }
}
