<?php

namespace Database\Seeders;

use App\Modules\Assessment\Infrastructure\Models\Question;
use Illuminate\Database\Seeder;

class QuestionSeeder extends Seeder
{
    public function run(): void
    {
        $questions = [
            ['level' => 'beginner', 'domain' => 'frontend', 'question_text' => 'What does CSS stand for?', 'type' => 'mcq', 'difficulty' => 1],
            ['level' => 'beginner', 'domain' => 'frontend', 'question_text' => 'Describe the box model.', 'type' => 'text', 'difficulty' => 2],
            ['level' => 'beginner', 'domain' => 'backend', 'question_text' => 'What is PSR-4 autoloading?', 'type' => 'text', 'difficulty' => 2],
            ['level' => 'beginner', 'domain' => 'backend', 'question_text' => 'How do you create a migration in Laravel?', 'type' => 'mcq', 'difficulty' => 1],
            ['level' => 'intermediate', 'domain' => 'frontend', 'question_text' => 'Explain React hooks useEffect and useMemo.', 'type' => 'text', 'difficulty' => 3],
        ];

        foreach ($questions as $question) {
            Question::updateOrCreate(
                [
                    'question_text' => $question['question_text'],
                ],
                $question
            );
        }
    }
}
