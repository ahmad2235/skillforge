<?php
require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\User;
use App\Modules\Learning\Infrastructure\Models\Task;
use App\Modules\Learning\Infrastructure\Models\Submission;

// Find a student
$user = User::where('email','fatima@example.com')->first();
if (! $user) {
    $user = User::factory()->create(['role'=>'student','email'=>'fatima@example.com']);
}

$task = Task::whereJsonContains('metadata->requires_attachment', true)->first();
if (! $task) {
    $task = Task::first();
}

$sub = Submission::create([
    'user_id' => $user->id,
    'task_id' => $task->id,
    'attachment_url' => 'https://github.com/example/repo',
    'answer_text' => 'Created for smoke test',
    'status' => 'submitted',
    'submitted_at' => now(),
]);

// Dispatch the job to the queue (not run sync)
dispatch(new \App\Jobs\EvaluateSubmissionJob($sub->id));

echo "created_submission_id={$sub->id}\n";
