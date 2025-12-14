<?php

namespace App\Modules\AI\Application\Services;

use App\Modules\Learning\Infrastructure\Models\Submission;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TaskEvaluationService
{
    private string $evaluatorUrl;

    public function __construct()
    {
        $this->evaluatorUrl = config('services.evaluator.url', 'http://127.0.0.1:8001');
    }

    /**
     * Evaluate a submission using the AI Project Evaluator service.
     *
     * Calls the external Python FastAPI evaluator service which uses OpenAI GPT-4
     * to analyze project code and provide comprehensive feedback.
     *
     * @param Submission $submission
     * @return array {
     *     'score' => int|null (0-100),
     *     'feedback' => string|null,
     *     'metadata' => array with full evaluation details
     * }
     */
    public function evaluateSubmission(Submission $submission): array
    {
        try {
            // Prepare submission data
            $projectDescription = $submission->task->description ?? 'Project submission';
            $studentLanguage = $submission->task->metadata['language'] ?? 'Unknown';
            $studentRunStatus = $submission->metadata['run_status'] ?? 'Not specified';
            $knownIssues = $submission->metadata['known_issues'] ?? '';

            // Build multipart form data with file
            $filePath = $submission->attachment_url;
            if ($filePath && !filter_var($filePath, FILTER_VALIDATE_URL)) {
                $filePath = storage_path('app' . $filePath);
            }

            if (!$filePath || !file_exists($filePath)) {
                Log::warning("Evaluator: File not found for submission {$submission->id}");
                return [
                    'score' => null,
                    'feedback' => 'File not available for evaluation.',
                    'metadata' => ['error' => 'file_not_found'],
                ];
            }

            // Call the evaluator service
            $response = Http::timeout(120)
                ->attach('file', fopen($filePath, 'r'), basename($filePath))
                ->asForm()
                ->post("{$this->evaluatorUrl}/evaluate", [
                    'project_description' => $projectDescription,
                    'student_language' => $studentLanguage,
                    'student_run_status' => $studentRunStatus,
                    'known_issues' => $knownIssues,
                ]);

            if (!$response->successful()) {
                Log::error("Evaluator API error: {$response->status()} - {$response->body()}");
                return [
                    'score' => null,
                    'feedback' => 'Evaluation service is currently unavailable.',
                    'metadata' => ['error' => 'api_error', 'status' => $response->status()],
                ];
            }

            $data = $response->json();

            if (!$data['success'] ?? false) {
                Log::error("Evaluator returned success=false");
                return [
                    'score' => null,
                    'feedback' => 'Evaluation failed.',
                    'metadata' => ['error' => 'invalid_response'],
                ];
            }

            $evaluation = $data['data'] ?? [];

            // Extract score and feedback
            $score = $evaluation['total_score'] ?? null;
            $feedback = $this->buildFeedback($evaluation);

            return [
                'score' => $score,
                'feedback' => $feedback,
                'metadata' => $evaluation, // Store full evaluation for later analysis
            ];

        } catch (\Exception $e) {
            Log::error("TaskEvaluationService error: {$e->getMessage()}");
            return [
                'score' => null,
                'feedback' => 'An error occurred during evaluation.',
                'metadata' => ['error' => 'exception', 'message' => $e->getMessage()],
            ];
        }
    }

    /**
     * Build a concise feedback message from the evaluation data.
     */
    private function buildFeedback(array $evaluation): ?string
    {
        $parts = [];

        // Overall result
        if ($evaluation['passed'] ?? false) {
            $parts[] = '✅ ' . ($evaluation['congrats_message'] ?? 'You passed the evaluation.');
        } else {
            $parts[] = '⚠️ Evaluation did not meet the passing threshold (80+).';
        }

        // Scores
        $parts[] = sprintf(
            'Functional: %d/70 | Code Quality: %d/30 | Total: %d/100',
            $evaluation['functional_score'] ?? 0,
            $evaluation['code_quality_score'] ?? 0,
            $evaluation['total_score'] ?? 0
        );

        // Key findings
        if ($assessment = $evaluation['project_assessment'] ?? null) {
            if ($assessment['estimated_runs'] ?? null) {
                $parts[] = "Estimated runs: {$assessment['estimated_runs']}";
            }
            if ($comment = $assessment['estimated_runs_comment'] ?? null) {
                $parts[] = "Execution: {$comment}";
            }
        }

        // Developer level
        if ($devAssessment = $evaluation['developer_assessment'] ?? null) {
            if ($level = $devAssessment['estimated_level'] ?? null) {
                $parts[] = "Estimated level: {$level}";
            }
            if ($weaknesses = $devAssessment['weaknesses'] ?? null) {
                $parts[] = "Areas to improve: " . implode(', ', array_slice($weaknesses, 0, 2));
            }
        }

        // Summary
        if ($summary = $evaluation['summary'] ?? null) {
            $parts[] = "Summary: " . substr($summary, 0, 200) . (strlen($summary) > 200 ? '...' : '');
        }

        return implode("\n\n", array_filter($parts));
    }

    /**
     * Health check for the evaluator service.
     */
    public function isHealthy(): bool
    {
        try {
            $response = Http::timeout(5)->get("{$this->evaluatorUrl}/health");
            return $response->successful();
        } catch (\Exception $e) {
            Log::error("Evaluator health check failed: {$e->getMessage()}");
            return false;
        }
    }
}
