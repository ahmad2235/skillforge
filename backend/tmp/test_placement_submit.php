<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';

$svc = $app->make(App\Modules\Assessment\Application\Services\PlacementService::class);
$user = App\Models\User::where('role','student')->first();
$question = App\Modules\Assessment\Infrastructure\Models\Question::where('domain','frontend')->first();
$data = [
    'domain' => 'frontend',
    'answers' => [
        ['question_id' => $question->id, 'answer' => 'A'],
    ],
];

$res = $svc->submitAnswers($user, $data);
echo json_encode($res, JSON_PRETTY_PRINT) . PHP_EOL;
