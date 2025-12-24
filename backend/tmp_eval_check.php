<?php
require __DIR__.'/vendor/autoload.php';
\ = require __DIR__.'/bootstrap/app.php';
\->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Modules\Learning\Infrastructure\Models\Submission;

\ = Submission::latest()->first();
if (!\) { echo "no submissions\n"; exit; }

\ = \->aiEvaluations()->latest('id')->first();

echo "sub=\->id\n";
echo "eval_status=".(\->status ?? "null")."\n";
echo "meta=".json_encode(\->metadata ?? null)."\n";
