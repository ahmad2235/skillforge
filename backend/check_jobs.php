<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "=== Checking Jobs Queue ===\n";
$jobs = \Illuminate\Support\Facades\DB::table('jobs')->get();
echo "Pending jobs in queue: " . $jobs->count() . "\n";
foreach ($jobs as $job) {
    echo "Job ID: {$job->id}, Queue: {$job->queue}, Attempts: {$job->attempts}, Payload: " . substr($job->payload, 0, 200) . "...\n";
}

echo "\n=== Checking Failed Jobs ===\n";
$failedJobs = \Illuminate\Support\Facades\DB::table('failed_jobs')->get();
echo "Failed jobs: " . $failedJobs->count() . "\n";
foreach ($failedJobs as $job) {
    echo "Job ID: {$job->id}, Connection: {$job->connection}, Queue: {$job->queue}, Failed at: {$job->failed_at}\n";
    echo "Exception: " . substr($job->exception, 0, 500) . "...\n\n";
}
