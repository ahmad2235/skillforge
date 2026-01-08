<?php

namespace Database\Factories;

use App\Models\User;
use App\Modules\Gamification\Infrastructure\Models\Portfolio;
use App\Modules\Learning\Infrastructure\Models\LevelProject;
use App\Modules\Projects\Infrastructure\Models\Project;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Modules\Gamification\Infrastructure\Models\Portfolio>
 */
class PortfolioFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var class-string<\App\Modules\Gamification\Infrastructure\Models\Portfolio>
     */
    protected $model = Portfolio::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory()->create(['role' => 'student'])->id,
            'project_id' => Project::factory()->create()->id,
            'level_project_id' => null,
            'title' => $this->faker->sentence(4),
            'description' => $this->faker->paragraph(),
            'github_url' => $this->faker->url(),
            'live_demo_url' => $this->faker->url(),
            'score' => $this->faker->numberBetween(70, 100),
            'feedback' => $this->faker->sentence(),
            'is_public' => true,
            'metadata' => [
                'category' => $this->faker->word(),
                'tags' => [$this->faker->word(), $this->faker->word()],
                'project_name' => $this->faker->sentence(3),
                'created_at' => now()->toDateTimeString(),
            ],
        ];
    }

    /**
     * Create a portfolio item from a level project.
     */
    public function fromLevelProject(): self
    {
        return $this->state(function (array $attributes) {
            return [
                'project_id' => null,
                'level_project_id' => LevelProject::factory()->create()->id,
            ];
        });
    }

    /**
     * Create a private portfolio item.
     */
    public function private(): self
    {
        return $this->state(function (array $attributes) {
            return [
                'is_public' => false,
            ];
        });
    }

    /**
     * Create a portfolio item without links.
     */
    public function withoutLinks(): self
    {
        return $this->state(function (array $attributes) {
            return [
                'github_url' => null,
                'live_demo_url' => null,
            ];
        });
    }
}
