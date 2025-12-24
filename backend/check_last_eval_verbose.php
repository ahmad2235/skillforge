<?php
require __DIR__.'/vendor/autoload.php';
$app = require __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
use App\Modules\Learning\Infrastructure\Models\Submission;

echo "DEBUG: starting\n";
$s = Submission::latest()->first();
var_export(['s_exists' => (bool)$s]);
echo PHP_EOL;
$e = $s?->aiEvaluations()->latest('id')->first();
var_export(['e_exists' => (bool)$e]);
echo PHP_EOL;

if ($s) {
    echo 'sub_id=' . ($s->id ?? 'null') . PHP_EOL;
    echo 'sub_status=' . ($s->status ?? 'null') . PHP_EOL;
    echo 'ai_score=' . var_export($s->ai_score,true) . PHP_EOL;
    echo 'final_score=' . var_export($s->final_score,true) . PHP_EOL;
} else {
    echo "No submission found\n";
}

if ($e) {
    echo 'ai_eval_id=' . ($e->id ?? 'null') . PHP_EOL;
    echo 'ai_eval_status=' . ($e->status ?? 'null') . PHP_EOL;
    echo 'meta=' . json_encode($e->metadata) . PHP_EOL;
} else {
    echo "No ai_evaluation found\n";
}
