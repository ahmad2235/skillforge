<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;
use App\Modules\Learning\Infrastructure\Models\Submission;

echo "Jobs table (first 10):\n";
$jobs = DB::table('jobs')->take(10)->get();
foreach ($jobs as $j) {
    echo "id={$j->id} queue={$j->queue} attempts={$j->attempts} available_at={$j->available_at}\n";
    $payload = $j->payload;
    // show abbreviated payload
    $snippet = substr($payload, 0, 800);
    echo "payload_snippet=\n" . $snippet . "\n---\n";
}

echo "Failed jobs (first 10):\n";
$failed = DB::table('failed_jobs')->take(10)->get();
foreach ($failed as $f) {
    echo "id={$f->id} connection={$f->connection} queue={$f->queue} failed_at={$f->failed_at}\n";
    echo "exception_snippet=\n" . substr($f->exception, 0, 800) . "\n---\n";
}

$submissionId = 12;
$s = Submission::find($submissionId);
if (!$s) {
    echo "Submission {$submissionId} not found\n";
    exit(0);
}

echo "Submission {$submissionId} summary:\n";
echo json_encode([
    'id' => $s->id,
    'status' => $s->status,
    'is_evaluated' => $s->is_evaluated,
    'ai_score' => $s->ai_score,
    'ai_feedback' => $s->ai_feedback,
    'attachment_url' => $s->attachment_url,
    'ai_evals_count' => $s->aiEvaluations()->count(),
], JSON_PRETTY_PRINT) . "\n";

$ae = $s->latestAiEvaluationResolved();
if ($ae) {
    echo "Latest ai_evaluation:\n" . json_encode([
        'id' => $ae->id,
        'status' => $ae->status,
        'score' => $ae->score,
        'error_message' => $ae->error_message,
        'started_at' => $ae->started_at?->toISOString() ?? null,
        'completed_at' => $ae->completed_at?->toISOString() ?? null,
    ], JSON_PRETTY_PRINT) . "\n";
} else {
    echo "No ai_evaluations for submission {$submissionId}\n";
}
