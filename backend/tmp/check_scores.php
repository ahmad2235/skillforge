<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

$sub = App\Modules\Learning\Infrastructure\Models\Submission::with('aiEvaluations')->find(25);

echo "=== Submission 25 ===\n";
echo "Final Score: " . $sub->final_score . "\n";
echo "AI Feedback:\n" . $sub->ai_feedback . "\n\n";

$latest = $sub->aiEvaluations->last();
if ($latest) {
    echo "=== Latest AI Evaluation ===\n";
    $meta = $latest->metadata;
    echo "functional_score: " . ($meta['functional_score'] ?? 'NULL') . "\n";
    echo "code_quality_score: " . ($meta['code_quality_score'] ?? 'NULL') . "\n";
    echo "total_score: " . ($meta['total_score'] ?? 'NULL') . "\n";
    echo "rubric_scores: " . json_encode($meta['rubric_scores'] ?? null, JSON_PRETTY_PRINT) . "\n";
}
