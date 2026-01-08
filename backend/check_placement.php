<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "=== Checking User Data ===\n";
$user = \App\Models\User::where('role', 'student')->first();
if ($user) {
    echo "User ID: {$user->id}\n";
    echo "User domain: {$user->domain}\n";
    echo "User level: {$user->level}\n\n";
}

echo "=== Checking Latest Placement ===\n";
$placement = \App\Modules\Assessment\Infrastructure\Models\PlacementResult::latest()->first();
if ($placement) {
    echo "Placement ID: {$placement->id}\n";
    echo "User ID: {$placement->user_id}\n";
    echo "Domain: {$placement->final_domain}\n";
    echo "Level: {$placement->final_level}\n";
    echo "Score: {$placement->overall_score}\n";
    echo "Status: {$placement->status}\n";
    echo "Created: {$placement->created_at}\n";
    echo "Updated: {$placement->updated_at}\n\n";
}

echo "=== Checking User Roadmap Blocks ===\n";
$blocks = \App\Modules\Learning\Infrastructure\Models\UserRoadmapBlock::where('user_id', $user->id)
    ->with('roadmapBlock')
    ->get();
    
echo "Total blocks assigned: " . $blocks->count() . "\n";
foreach ($blocks as $userBlock) {
    $block = $userBlock->roadmapBlock;
    if ($block) {
        echo "- Block #{$block->order_index}: {$block->title} (Domain: {$block->domain}, Level: {$block->level})\n";
    }
}
