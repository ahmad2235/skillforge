<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "=== Checking User 6 (Placement owner) ===\n";
$user = \App\Models\User::find(6);
if ($user) {
    echo "User ID: {$user->id}\n";
    echo "Name: {$user->name}\n";
    echo "Email: {$user->email}\n";
    echo "Role: {$user->role}\n";
    echo "Domain: {$user->domain}\n";
    echo "Level: {$user->level}\n\n";
    
    echo "=== User's Roadmap Blocks ===\n";
    $blocks = \App\Modules\Learning\Infrastructure\Models\UserRoadmapBlock::where('user_id', $user->id)
        ->get();
        
    echo "Total blocks assigned: " . $blocks->count() . "\n";
    foreach ($blocks as $userBlock) {
        $block = \App\Modules\Learning\Infrastructure\Models\RoadmapBlock::find($userBlock->roadmap_block_id);
        if ($block) {
            echo "- Block #{$block->order_index}: {$block->title} (Domain: {$block->domain}, Level: {$block->level})\n";
        }
    }
    
    echo "\n=== All Placements for User 6 ===\n";
    $placements = \App\Modules\Assessment\Infrastructure\Models\PlacementResult::where('user_id', 6)
        ->orderBy('created_at', 'desc')
        ->get();
    
    foreach ($placements as $p) {
        echo "Placement #{$p->id}: Status={$p->status}, Domain={$p->final_domain}, Level={$p->final_level}, Score={$p->overall_score}, Created={$p->created_at}\n";
    }
}
