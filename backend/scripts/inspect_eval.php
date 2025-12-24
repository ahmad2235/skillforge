<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

$sub = DB::table('submissions')->where('attachment_url', 'https://github.com/example/repo')->orderBy('id', 'desc')->first();
if (!$sub) {
    echo json_encode(['error' => 'no_submission_found']) . PHP_EOL;
    exit(0);
}
$ae = DB::table('ai_evaluations')->where('submission_id', $sub->id)->orderBy('id', 'desc')->first();

echo json_encode(['submission' => $sub, 'ai_evaluation' => $ae], JSON_PRETTY_PRINT) . PHP_EOL;
