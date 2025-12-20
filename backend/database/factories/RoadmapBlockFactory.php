<?php

namespace Database\Factories;

use App\Modules\Learning\Infrastructure\Models\RoadmapBlock;
use Illuminate\Database\Eloquent\Factories\Factory;

class RoadmapBlockFactory extends Factory
{
    protected $model = RoadmapBlock::class;

    public function definition(): array
    {
        $level = $this->faker->randomElement(['beginner', 'intermediate', 'advanced']);
        $domain = $this->faker->randomElement(['frontend', 'backend']);

        return [
            'level' => $level,
            'domain' => $domain,
            'title' => $this->faker->sentence(3),
            'description' => $this->faker->sentence(8),
            'order_index' => $this->faker->numberBetween(1, 5),
            'estimated_hours' => $this->faker->numberBetween(2, 8),
            'is_optional' => false,
        ];
    }
}
