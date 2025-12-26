<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

$latest = \App\Modules\Learning\Infrastructure\Models\AiEvaluation::where('submission_id', 25)
    ->latest()
    ->first();

if ($latest && isset($latest->metadata['summary'])) {
    echo "Summary length: " . strlen($latest->metadata['summary']) . "\n\n";
    echo "Full summary:\n";
    echo $latest->metadata['summary'] . "\n";
}
