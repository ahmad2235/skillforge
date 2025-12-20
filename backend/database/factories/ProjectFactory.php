<?php

namespace Database\Factories;

use App\Models\User;
use App\Modules\Projects\Infrastructure\Models\Project;
use Illuminate\Database\Eloquent\Factories\Factory;

class ProjectFactory extends Factory
{
    protected $model = Project::class;

    public function definition(): array
    {
        $owner = User::factory()->business()->create();

        return [
            'owner_id' => $owner->id,
            'title' => $this->faker->sentence(3),
            'description' => $this->faker->paragraph(1),
            'domain' => $this->faker->randomElement(['frontend', 'backend']),
            'required_level' => $this->faker->randomElement(['beginner', 'intermediate', 'advanced']),
            'min_score_required' => null,
            'status' => 'open',
            'min_team_size' => null,
            'max_team_size' => null,
            'estimated_duration_weeks' => 4,
            'metadata' => ['source' => 'factory'],
        ];
    }
}
