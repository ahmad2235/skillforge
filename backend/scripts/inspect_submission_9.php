<?php
require __DIR__ . '/../vendor/autoload.php';
use App\Modules\Learning\Infrastructure\Models\Submission;
use App\Modules\Learning\Infrastructure\Models\AiEvaluation;

$s = Submission::find(9);
$ae = AiEvaluation::where('submission_id', 9)->orderBy('id', 'desc')->first();
$out = [
    'submission' => $s ? $s->toArray() : null,
    'ai_evaluation' => $ae ? $ae->toArray() : null,
];
echo json_encode($out, JSON_PRETTY_PRINT) . "\n";