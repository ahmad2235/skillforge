<?php

namespace Database\Factories;

use App\Models\User;
use App\Modules\Projects\Infrastructure\Models\Project;
use App\Modules\Projects\Infrastructure\Models\ProjectAssignment;
use Illuminate\Database\Eloquent\Factories\Factory;

class ProjectAssignmentFactory extends Factory
{
    protected $model = ProjectAssignment::class;

    public function definition(): array
    {
        return [
            'project_id' => Project::factory(),
            'user_id' => User::factory()->student()->create()->id,
            'team_id' => null,
            'status' => 'pending',
            'match_score' => null,
            'assigned_at' => null,
            'completed_at' => null,
            'notes' => null,
            'metadata' => ['source' => 'factory'],
        ];
    }
}
