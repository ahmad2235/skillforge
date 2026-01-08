<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

// Find the pending placement
$placement = \App\Modules\Assessment\Infrastructure\Models\PlacementResult::where('status', 'pending')->first();

if (!$placement) {
    echo "No pending placements found. Looking for latest placement...\n";
    $placement = \App\Modules\Assessment\Infrastructure\Models\PlacementResult::latest()->first();
}

if ($placement) {
    echo "Resetting placement #{$placement->id} to pending status for re-evaluation...\n";
    $placement->update([
        'status' => 'pending',
        'evaluation_started_at' => null,
        'evaluation_completed_at' => null,
        'overall_score' => 0,
        'final_level' => 'beginner',
        'details' => ['evaluation_status' => 'pending_retry'],
    ]);
    
    echo "Dispatching EvaluatePlacementJob...\n";
    \App\Jobs\EvaluatePlacementJob::dispatch($placement->id)->onQueue('default');
    
    echo "Job dispatched successfully!\n";
    echo "Placement #{$placement->id} status: " . $placement->status . "\n";
} else {
    echo "No placements found.\n";
}
