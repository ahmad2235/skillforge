<?php
require __DIR__.'/vendor/autoload.php';
$app = require __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
use App\Modules\Learning\Infrastructure\Models\Submission;

$s = Submission::latest()->first();
$e = $s?->aiEvaluations()->latest('id')->first();

echo 'sub_id=' . ($s?->id ?? 'null') . PHP_EOL;
echo 'sub_status=' . ($s?->status ?? 'null') . PHP_EOL;
echo 'ai_eval_id=' . ($e?->id ?? 'null') . PHP_EOL;
echo 'ai_eval_status=' . ($e?->status ?? 'null') . PHP_EOL;
echo 'meta=' . json_encode($e?->metadata) . PHP_EOL;
echo 'ai_score=' . var_export($s?->ai_score,true) . PHP_EOL;
echo 'final_score=' . var_export($s?->final_score,true) . PHP_EOL;
