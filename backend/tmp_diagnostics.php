<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Modules\Learning\Infrastructure\Models\Submission;

$s = Submission::latest()->first();
if (!$s) {
    echo "No submissions found\n";
    exit(0);
}

echo 'submission=' . $s->id . PHP_EOL;
echo 'evals=' . $s->aiEvaluations()->count() . PHP_EOL;
$e = $s->latestAiEvaluationResolved();
if ($e) {
    echo 'latest=' . ($e->status ?? 'null') . PHP_EOL;
    echo 'latest_id=' . ($e->id ?? 'null') . PHP_EOL;
    echo 'latest_updated_at=' . ($e->completed_at?->toISOString() ?? $e->created_at?->toISOString() ?? 'null') . PHP_EOL;
    echo 'last_job_attempted_at=' . ($e->started_at?->toISOString() ?? 'null') . PHP_EOL;
} else {
    echo 'latest=null' . PHP_EOL;
}

echo 'jobs=' . \DB::table('jobs')->count() . PHP_EOL;
echo 'failed_jobs=' . \DB::table('failed_jobs')->count() . PHP_EOL;
