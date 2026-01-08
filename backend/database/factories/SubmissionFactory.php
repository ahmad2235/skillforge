<?php

namespace Database\Factories;

use App\Modules\Learning\Infrastructure\Models\Submission;
use App\Modules\Learning\Infrastructure\Models\Task;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class SubmissionFactory extends Factory
{
    protected $model = Submission::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'task_id' => Task::factory(),
            'answer_text' => $this->faker->paragraph(),
            'status' => 'submitted',
            'submitted_at' => now(),
        ];
    }
}