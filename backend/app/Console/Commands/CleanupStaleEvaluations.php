<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Modules\Learning\Infrastructure\Models\Submission;
use App\Modules\Learning\Infrastructure\Models\AiEvaluation;
use Illuminate\Support\Facades\Log;

/**
 * Clean up submissions that are stuck in 'evaluating' state for too long.
 * 
 * This command should be run periodically (e.g., every 5 minutes via scheduler)
 * to ensure no submissions remain in infinite 'evaluating' state.
 */
class CleanupStaleEvaluations extends Command
{
    protected $signature = 'evaluations:cleanup-stale 
                            {--minutes=10 : Mark as stale after this many minutes}
                            {--dry-run : Show what would be cleaned up without making changes}';

    protected $description = 'Mark stale evaluations (stuck in evaluating) as timed_out';

    public function handle(): int
    {
        $minutes = (int) $this->option('minutes');
        $dryRun = (bool) $this->option('dry-run');
        
        $cutoff = now()->subMinutes($minutes);
        
        $staleSubmissions = Submission::where('evaluation_status', 'evaluating')
            ->where('updated_at', '<', $cutoff)
            ->get();

        if ($staleSubmissions->isEmpty()) {
            $this->info('No stale evaluations found.');
            return 0;
        }

        $this->info("Found {$staleSubmissions->count()} stale submission(s) older than {$minutes} minutes.");

        foreach ($staleSubmissions as $submission) {
            $ageMinutes = now()->diffInMinutes($submission->updated_at);
            
            if ($dryRun) {
                $this->line("  [DRY RUN] Would mark submission #{$submission->id} as timed_out (age: {$ageMinutes} min)");
                continue;
            }

            // Create an AiEvaluation record for audit trail
            $ae = AiEvaluation::create([
                'submission_id' => $submission->id,
                'provider' => 'openai',
                'status' => 'failed',
                'semantic_status' => 'timed_out',
                'score' => null,
                'feedback' => 'Evaluation timed out after ' . $ageMinutes . ' minutes. Your submission will be reviewed manually.',
                'error_message' => 'Stale evaluation cleanup - exceeded ' . $minutes . ' minute threshold',
                'metadata' => [
                    'evaluation_outcome' => 'timed_out',
                    'reason' => 'stale_cleanup',
                    'stale_minutes' => $ageMinutes,
                    'cleaned_at' => now()->toIso8601String(),
                ],
                'started_at' => $submission->updated_at,
                'completed_at' => now(),
            ]);

            // Update submission to terminal state
            $submission->evaluation_status = 'timed_out';
            $submission->ai_feedback = 'Evaluation timed out. Your submission will be reviewed manually.';
            $submission->ai_metadata = [
                'evaluation_outcome' => 'timed_out',
                'reason' => 'stale_cleanup',
                'timed_out_at' => now()->toIso8601String(),
            ];
            $submission->latest_ai_evaluation_id = $ae->id;
            $submission->save();

            Log::warning("CleanupStaleEvaluations: Marked submission #{$submission->id} as timed_out (age: {$ageMinutes} min)");
            $this->line("  Marked submission #{$submission->id} as timed_out (age: {$ageMinutes} min)");
        }

        $this->info('Cleanup complete.');
        return 0;
    }
}
