<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use App\Modules\Learning\Infrastructure\Models\Submission;
use App\Modules\Learning\Infrastructure\Models\AiEvaluation;

class RepairAiDisabledSubmissions extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'ai:repair-disabled-submissions {--dry-run}';

    /**
     * The description of the console command.
     */
    protected $description = 'Repair submissions marked as "succeeded" when AI was disabled (metadata.ai_disabled=true). Converts them to "needs_manual_review" with null scores.';

    /**
     * Execute the command.
     */
    public function handle(): int
    {
        $dryRun = $this->option('dry-run');

        if ($dryRun) {
            $this->line('<info>Running in DRY RUN mode - no changes will be made.</info>');
        }

        // Find submissions where ai_evaluations.metadata.ai_disabled is set (in various representations)
        // and either the ai_evaluation row is 'succeeded' or the submission is 'evaluated'.
        $driver = null;
        try {
            $driver = DB::getPdo()->getAttribute(\PDO::ATTR_DRIVER_NAME);
        } catch (\Throwable $t) {
            // ignore and fallback to assuming mysql-like behavior
            $driver = null;
        }

        // We no longer require the ai_evaluation to be the latest pointer; some bad rows
        // may be historical succeeded evaluations. Find ai_evaluations directly with status 'succeeded'
        // and metadata indicating ai_disabled or manual_review outcome.
        $evalQuery = DB::table('ai_evaluations')->where('status', 'succeeded')
            ->where(function ($q) {
                $q->where('metadata', 'like', '%"ai_disabled"%')
                  ->orWhere('metadata', 'like', '%"reason":"ai_disabled"%')
                  ->orWhere('metadata', 'like', '%"evaluation_outcome":"manual_review"%');
            });

        // Additional safety for SQLite: ensure we catch variants without spaces or numeric values
        if ($driver === 'sqlite') {
            $evalQuery->where(function ($q) {
                $q->orWhere('metadata', 'like', '%"ai_disabled": 1%')
                  ->orWhere('metadata', 'like', '%"ai_disabled":1%')
                  ->orWhere('metadata', 'like', '%"ai_disabled": true%')
                  ->orWhere('metadata', 'like', '%"ai_disabled":true%')
                  ->orWhere('metadata', 'like', '%"ai_disabled":"1"%')
                  ->orWhere('metadata', 'like', '%"ai_disabled":"true"%');
            });
        }

        $badEvals = $evalQuery->select(['id', 'submission_id', 'status', 'metadata'])->orderByDesc('id')->get();

        if ($badEvals->isEmpty()) {
            $this->info('No succeeded ai_evaluations found with ai_disabled/manual_review in metadata.');
            return 0;
        }

        $this->warn(sprintf('Found %d problematic ai_evaluations requiring repair:', $badEvals->count()));
        $this->line('');

        // Print a sample of evaluation ids (id -> submission_id)
        $sample = $badEvals->take(10)->map(fn($e) => "eval_id={$e->id} sub_id={$e->submission_id}")->toArray();
        foreach ($sample as $line) { $this->line('  * '.$line); }
        $this->line('');

        $updatedEvals = 0;
        $updatedSubs = 0;
        $repairedSubmissionIds = [];

        foreach ($badEvals as $eval) {
            if ($dryRun) {
                $this->line("Dry-run: would repair eval {$eval->id} (submission {$eval->submission_id})");
                continue;
            }

            DB::transaction(function () use ($eval, &$updatedEvals, &$updatedSubs, &$repairedSubmissionIds) {
                // Parse existing metadata safely
                $meta = @json_decode($eval->metadata ?? '{}', true) ?: [];

                // Ensure required fields
                $meta['evaluation_outcome'] = 'manual_review';
                $meta['reason'] = 'ai_disabled';
                $meta['ai_disabled'] = true;

                // Update ai_evaluations row
                $update = ['status' => 'failed', 'metadata' => json_encode($meta)];

                // If 'score' column exists, null it
                try {
                    if (\Illuminate\Support\Facades\Schema::hasColumn('ai_evaluations', 'score')) {
                        $update['score'] = null;
                    }
                    if (\Illuminate\Support\Facades\Schema::hasColumn('ai_evaluations', 'rubric_scores')) {
                        $update['rubric_scores'] = null;
                    }
                } catch (\Throwable $t) {
                    // ignore schema checks in unusual environments
                }

                DB::table('ai_evaluations')->where('id', $eval->id)->update($update);
                $updatedEvals++;

                // Repair submission record: set needs_manual_review and null snapshots
                $subUpdate = [
                    'status' => 'needs_manual_review',
                    'ai_score' => null,
                    'final_score' => null,
                    'rubric_scores' => null,
                    'is_evaluated' => false,
                    'evaluated_at' => null,
                ];

                $affected = DB::table('submissions')->where('id', $eval->submission_id)->update($subUpdate);
                if ($affected) {
                    $updatedSubs++;
                    $repairedSubmissionIds[] = $eval->submission_id;
                }
            });
        }

        $this->line('');
        $this->info(sprintf('EVALUATIONS UPDATED: %d', $updatedEvals));
        $this->info(sprintf('SUBMISSIONS REPAIRED: %d', $updatedSubs));

        if (!empty($repairedSubmissionIds)) {
            $this->line('Repaired submission IDs:');
            $this->line(implode(', ', array_unique($repairedSubmissionIds)));
        }

        return 0;
    }
}
