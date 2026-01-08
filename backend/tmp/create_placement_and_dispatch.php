<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';

use App\Modules\Assessment\Infrastructure\Models\PlacementResult;
use App\Models\User;
use App\Modules\Assessment\Infrastructure\Models\Question;

$student = User::where('role','student')->first();
$question = Question::first();
if (! $student || ! $question) {
    echo "Missing student or question\n";
    exit(1);
}

$placement = PlacementResult::create([
    'user_id' => $student->id,
    'final_level' => 'beginner',
    'final_domain' => 'frontend',
    'overall_score' => 0,
    'details' => ['total_questions' => 1, 'evaluation_status' => 'pending'],
    'pending_answers' => [['question_id' => $question->id, 'answer' => 'Test answer for evaluator']],
    'status' => 'pending',
    'is_active' => true,
]);

App\Jobs\EvaluatePlacementJob::dispatch($placement->id)->onQueue('default');

echo "Dispatched job for placement id: {$placement->id}\n";