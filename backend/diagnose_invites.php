<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "=== INVITE LOGIC DIAGNOSTIC ===\n\n";

echo "1. Checking project_assignments table structure...\n";
$columns = \Illuminate\Support\Facades\DB::select("DESCRIBE project_assignments");
$statusColumn = null;
foreach ($columns as $col) {
    if ($col->Field === 'status') {
        $statusColumn = $col;
        echo "   Status column type: {$col->Type}\n";
        echo "   Status column null: {$col->Null}\n";
        break;
    }
}

echo "\n2. Checking for pending/frozen/cancelled assignments...\n";
$assignments = \Illuminate\Support\Facades\DB::table('project_assignments')
    ->select('id', 'user_id', 'project_id', 'status', 'invite_token_hash', 'invite_expires_at', 'invited_at', 'created_at')
    ->orderByDesc('created_at')
    ->limit(10)
    ->get();

foreach ($assignments as $a) {
    echo "Assignment #{$a->id}: user_id={$a->user_id}, project_id={$a->project_id}, status={$a->status}\n";
    echo "   Token hash: " . (substr($a->invite_token_hash, 0, 10) . '...' ?? 'NULL') . "\n";
    echo "   Expires at: {$a->invite_expires_at}\n";
    echo "   Invited at: {$a->invited_at}\n";
    echo "   Created at: {$a->created_at}\n";
}

echo "\n3. Checking Team models...\n";
$teams = \App\Modules\Projects\Infrastructure\Models\Team::limit(5)->get();
foreach ($teams as $team) {
    echo "Team #{$team->id}: name={$team->name}, status={$team->status}\n";
    $assignments = \App\Modules\Projects\Infrastructure\Models\ProjectAssignment::where('team_id', $team->id)->get();
    echo "   Assignments: " . $assignments->count() . "\n";
    foreach ($assignments as $a) {
        echo "     - #{$a->id}: status={$a->status}\n";
    }
}

echo "\n4. Testing invite acceptance (simulated flow)...\n";
$testAssignment = \App\Modules\Projects\Infrastructure\Models\ProjectAssignment::where('status', 'pending')
    ->whereNotNull('invite_expires_at')
    ->with('user', 'project')
    ->first();

if ($testAssignment) {
    echo "Found test assignment #{$testAssignment->id}\n";
    echo "   Student: {$testAssignment->user->name} (ID: {$testAssignment->user->id})\n";
    echo "   Project: {$testAssignment->project->title} (ID: {$testAssignment->project->id})\n";
    echo "   Token valid: " . ($testAssignment->invite_expires_at->isFuture() ? 'YES (not expired)' : 'NO (expired)') . "\n";
} else {
    echo "No pending assignments with invite tokens found.\n";
}

echo "\n=== END DIAGNOSTIC ===\n";
