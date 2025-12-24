<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

$submissionId = intval($argv[1] ?? 0);
if (!$submissionId) {
  echo "Usage: php print_eval.php <submissionId>\n";
  exit(1);
}

$sub = DB::table('submissions')->where('id', $submissionId)->first();
$evals = DB::table('ai_evaluations')->where('submission_id', $submissionId)->orderBy('id','desc')->get();

echo "submission=" . json_encode($sub, JSON_PRETTY_PRINT) . "\n";
echo "eval_count=" . count($evals) . "\n";
echo "latest_eval=" . json_encode($evals[0] ?? null, JSON_PRETTY_PRINT) . "\n";
