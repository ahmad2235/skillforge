<?php
require __DIR__.'/../vendor/autoload.php';
$app=require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
use Illuminate\Support\Facades\DB;

$rows = DB::table('ai_evaluations')->where('status','succeeded')->get();
echo "Found: " . count($rows) . " succeeded ai_evaluations\n";
foreach ($rows as $r) {
    $s = DB::table('submissions')->where('latest_ai_evaluation_id', $r->id)->first();
    echo "eval_id={$r->id} eval_status={$r->status} submission_id=" . ($s->id ?? 'null') . " sub_status=" . ($s->status ?? 'null') . " ai_score=" . var_export($s->ai_score ?? null, true) . " final_score=" . var_export($s->final_score ?? null, true) . " meta=" . $r->metadata . "\n";
}
