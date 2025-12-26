<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

$sub = App\Modules\Learning\Infrastructure\Models\Submission::with('aiEvaluations')->find(25);

if (!$sub) {
    echo "Submission 25 not found\n";
    exit(1);
}

$latest = $sub->aiEvaluations->last();
if (!$latest) {
    echo "No AI evaluation found for submission 25\n";
    exit(1);
}

// Get the evaluation data and rebuild feedback using the updated service
$evaluationService = new \App\Modules\AI\Application\Services\TaskEvaluationService();

// Call the private buildFeedback method using reflection
$reflection = new ReflectionClass($evaluationService);
$method = $reflection->getMethod('buildFeedback');
$method->setAccessible(true);

$newFeedback = $method->invoke($evaluationService, $latest->metadata);

echo "=== OLD FEEDBACK ===\n";
echo $sub->ai_feedback . "\n\n";

echo "=== NEW FEEDBACK ===\n";
echo $newFeedback . "\n\n";

// Update the submission
$sub->ai_feedback = $newFeedback;
$sub->save();

echo "✅ Updated submission 25's feedback\n";
