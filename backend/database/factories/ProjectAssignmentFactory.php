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
            'invite_token_hash' => hash('sha256', bin2hex(random_bytes(32))),
            'invite_expires_at' => now()->addDays(7),
            'invited_at' => now(),
            'match_score' => null,
            'assigned_at' => null,
            'completed_at' => null,
            'notes' => null,
            'cancelled_reason' => null,
            'metadata' => ['source' => 'factory'],
        ];
    }

    public function pending(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'pending',
            'invite_token_hash' => hash('sha256', bin2hex(random_bytes(32))),
            'invite_expires_at' => now()->addDays(7),
            'invited_at' => now(),
        ]);
    }

    public function accepted(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'accepted',
            'assigned_at' => now(),
        ]);
    }

    public function declined(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'declined',
        ]);
    }

    public function cancelled(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'cancelled',
            'cancelled_reason' => 'test_cancellation',
        ]);
    }

    public function completed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'completed',
            'assigned_at' => now()->subDays(10),
            'completed_at' => now(),
        ]);
    }

    public function expired(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'pending',
            'invite_expires_at' => now()->subDays(1),
        ]);
    }
}
