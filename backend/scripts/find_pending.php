<?php
require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
use App\Modules\Learning\Infrastructure\Models\Submission;

$s = Submission::where('status','submitted')->whereDoesntHave('aiEvaluations')->first();
if ($s) {
    echo $s->id . PHP_EOL;
} else {
    echo 'none' . PHP_EOL;
}
