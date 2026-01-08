<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "=== Checking Failed Jobs ===\n";
$failedJobs = \Illuminate\Support\Facades\DB::table('failed_jobs')->orderBy('failed_at', 'desc')->limit(5)->get();
echo "Failed jobs: " . $failedJobs->count() . "\n\n";
foreach ($failedJobs as $job) {
    echo "Job ID: {$job->id}\n";
    echo "Connection: {$job->connection}\n";
    echo "Queue: {$job->queue}\n";
    echo "Failed at: {$job->failed_at}\n";
    echo "Exception:\n";
    echo $job->exception . "\n";
    echo str_repeat("=", 80) . "\n\n";
}
