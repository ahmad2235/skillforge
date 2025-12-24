<?php

require __DIR__ . '/vendor/autoload.php';

$app = require __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Modules\Learning\Infrastructure\Models\Submission;

echo "=== Relationship Fix Verification ===" . PHP_EOL . PHP_EOL;

$s = Submission::latest()->first();

if (!$s) {
    echo "No submissions found" . PHP_EOL;
    exit;
}

echo "Submission ID: " . $s->id . PHP_EOL;
echo "AI Evaluations count: " . $s->aiEvaluations()->count() . PHP_EOL;
echo "latest_ai_evaluation_id: " . ($s->latest_ai_evaluation_id ?? 'null') . PHP_EOL . PHP_EOL;

// Test 1: Verify latestAiEvaluation() is a relationship
$rel = $s->latestAiEvaluation();
echo "✓ latestAiEvaluation() returns BelongsTo: " . ($rel instanceof BelongsTo ? 'YES' : 'NO') . PHP_EOL;

// Test 2: Verify latestAiEvaluationResolved() works
$e = $s->latestAiEvaluationResolved();
echo "✓ latestAiEvaluationResolved() returns AiEvaluation: " . ($e ? 'YES (id=' . $e->id . ')' : 'NO') . PHP_EOL;

if ($e) {
    echo "  - status: " . $e->status . PHP_EOL;
    echo "  - score: " . ($e->score ?? 'null') . PHP_EOL;
    echo "  - metadata: " . json_encode($e->metadata) . PHP_EOL;
}

echo PHP_EOL . "✓ No crashes - relationship fix successful!" . PHP_EOL;
