<?php

namespace Database\Factories;

use App\Modules\Assessment\Infrastructure\Models\Question;
use Illuminate\Database\Eloquent\Factories\Factory;

class QuestionFactory extends Factory
{
    protected $model = Question::class;

    public function definition(): array
    {
        $level = $this->faker->randomElement(['beginner', 'intermediate', 'advanced']);
        $domain = $this->faker->randomElement(['frontend', 'backend']);

        return [
            'level' => $level,
            'domain' => $domain,
            'question_text' => $this->faker->sentence(8),
            'type' => 'code',
            'difficulty' => 1,
            'metadata' => ['hint' => 'Use loops'],
        ];
    }
}
