<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Modules\Learning\Infrastructure\Models\Submission;
use App\Modules\AI\Application\Services\TaskEvaluationService;

class EvaluatorSmokeTest extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'evaluator:smoke {submission_id : The ID of the submission to evaluate}
                            {--timeout= : Override evaluator total timeout in seconds}
                            {--json : Output raw JSON result}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Run a one-off evaluator call for a submission and print a structured result for diagnostics';

    /**
     * Execute the console command.
     */
    public function handle(TaskEvaluationService $service): int
    {
        $submissionId = (int) $this->argument('submission_id');
        $overrideTimeout = $this->option('timeout');

        $submission = Submission::find($submissionId);
        if (!$submission) {
            $this->error("Submission {$submissionId} not found.");
            return self::FAILURE;
        }

        if ($overrideTimeout !== null) {
            $seconds = (int) $overrideTimeout;
            if ($seconds > 0) {
                config(['services.evaluator.timeout' => $seconds]);
                $this->info("Overriding evaluator timeout to {$seconds}s for this run.");
            }
        }

        $url = config('services.evaluator.url');
        $timeout = (int) config('services.evaluator.timeout');
        $healthTimeout = (int) config('services.evaluator.health_timeout');

        $this->line("Evaluator URL: {$url}");
        $this->line("Timeouts -> total: {$timeout}s, health: {$healthTimeout}s");

        // Perform evaluation
        $result = $service->evaluateSubmission($submission);

        if ($this->option('json')) {
            $this->line(json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
            return self::SUCCESS;
        }

        $status = $result['status'] ?? 'unknown';
        $score = $result['score'] ?? null;
        $feedback = $result['feedback'] ?? null;
        $metadata = $result['metadata'] ?? [];

        $this->info("Status: {$status}");
        if ($score !== null) {
            $this->line("Score: {$score}");
        } else {
            $this->line("Score: null");
        }

        if ($feedback) {
            $shortFb = mb_substr($feedback, 0, 240);
            if (mb_strlen($feedback) > 240) { $shortFb .= '...'; }
            $this->line("Feedback: {$shortFb}");
        }

        $reason = $metadata['reason'] ?? null;
        $err = $metadata['error'] ?? null;
        $evalOutcome = $metadata['evaluation_outcome'] ?? null;
        $statusCode = $metadata['status'] ?? null;

        if ($reason) {
            $this->line("Reason: {$reason}");
        }
        if ($evalOutcome) {
            $this->line("Outcome: {$evalOutcome}");
        }
        if ($statusCode !== null) {
            $this->line("HTTP Status (evaluator): {$statusCode}");
        }
        if ($err) {
            $shortErr = mb_substr((string) $err, 0, 240);
            if (mb_strlen((string) $err) > 240) { $shortErr .= '...'; }
            $this->line("Error: {$shortErr}");
        }

        return self::SUCCESS;
    }
}
