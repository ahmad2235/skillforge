<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';

// Use a simple DB insert to create a placement result for test
$pdo = $app->make('db')->connection()->getPdo();
$now = (new DateTime())->format('Y-m-d H:i:s');

// Find a student user
$student = App\Models\User::where('role','student')->first();
if (! $student) {
    echo "No student user found\n";
    exit(1);
}

$question = App\Modules\Assessment\Infrastructure\Models\Question::where('domain','frontend')->first();
if (! $question) {
    echo "No question found\n";
    exit(1);
}

$pdo->prepare('INSERT INTO placement_results (user_id, final_level, final_domain, overall_score, details, is_active, status, pending_answers, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    ->execute([$student->id, 'beginner', 'frontend', 0, json_encode(['total_questions' => 1, 'evaluation_status' => 'pending']), 1, 'pending', json_encode([['question_id' => $question->id, 'answer' => 'My answer']]), $now, $now]);

$placementId = $app->make('db')->table('placement_results')->orderByDesc('id')->value('id');

// Dispatch job
App\Jobs\EvaluatePlacementJob::dispatch($placementId)->onQueue('default');

echo "Created placement id: $placementId and dispatched job\n";