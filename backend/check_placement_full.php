<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "=== Placement #3 Full Details ===\n";
$placement = \App\Modules\Assessment\Infrastructure\Models\PlacementResult::find(3);

if ($placement) {
    echo "ID: {$placement->id}\n";
    echo "User ID: {$placement->user_id}\n";
    echo "Status: {$placement->status}\n";
    echo "Final Domain: {$placement->final_domain}\n";
    echo "Final Level: {$placement->final_level}\n";
    echo "Overall Score: {$placement->overall_score}\n";
    echo "Is Active: {$placement->is_active}\n";
    echo "Created At: {$placement->created_at}\n";
    echo "Updated At: {$placement->updated_at}\n";
    echo "Evaluation Started At: {$placement->evaluation_started_at}\n";
    echo "Evaluation Completed At: {$placement->evaluation_completed_at}\n";
    
    echo "\n=== Details Metadata ===\n";
    if ($placement->details) {
        echo json_encode($placement->details, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n";
    }
}

echo "\n=== User After Placement ===\n";
$user = \App\Models\User::find($placement->user_id);
if ($user) {
    echo "User domain: {$user->domain}\n";
    echo "User level: {$user->level}\n";
}
