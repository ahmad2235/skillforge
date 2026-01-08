<?php

namespace App\Modules\Assessment\Application\Services;

use App\Modules\Assessment\Infrastructure\Models\Question;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Service for evaluating placement test answers using AI.
 * 
 * MCQ questions are auto-scored by comparing to correct_answer.
 * Text questions are evaluated using the AI evaluator service.
 */
class QuestionEvaluationService
{
    private string $evaluatorUrl;
    private int $connectTimeout;
    private int $totalTimeout;
    private int $healthTimeout;
    private int $maxRetries;

    public function __construct()
    {
        $this->evaluatorUrl = config('services.evaluator.url', 'http://127.0.0.1:8001');
        $this->connectTimeout = config('services.evaluator.connect_timeout', 5);
        $this->totalTimeout = config('services.evaluator.timeout', 30);
        $this->healthTimeout = config('services.evaluator.health_timeout', 3);
        $this->maxRetries = config('services.evaluator.max_retries', 1); // Retry count from config
    }

    /**
     * Evaluate an MCQ question answer.
     * 
     * @param Question $question The question being answered
     * @param string|null $answer The student's answer (e.g., 'A', 'B', etc.)
     * @return array{score: int, is_correct: bool, feedback: string|null}
     */
    public function evaluateMcq(Question $question, ?string $answer): array
    {
        // Edge case: Answer is missing or empty
        if ($answer === null || trim($answer) === '') {
            return [
                'score' => 0,
                'is_correct' => false,
                'feedback' => 'No answer provided.',
            ];
        }

        $metadata = $question->metadata ?? [];
        $correctAnswer = $metadata['correct_answer'] ?? null;

        // Edge case: Question has no correct_answer in metadata
        if ($correctAnswer === null) {
            Log::warning("Question {$question->id} has no correct_answer in metadata, skipping MCQ scoring");
            return [
                'score' => 0,
                'is_correct' => false,
                'feedback' => 'Unable to evaluate: question configuration error.',
            ];
        }

        // Compare answers (case-insensitive)
        $isCorrect = strtoupper(trim($answer)) === strtoupper(trim($correctAnswer));

        return [
            'score' => $isCorrect ? 100 : 0,
            'is_correct' => $isCorrect,
            'feedback' => $isCorrect 
                ? 'Correct!' 
                : "Incorrect. The correct answer is: {$correctAnswer}",
        ];
    }

    /**
     * Evaluate a text question answer using AI.
     * 
     * @param Question $question The question being answered
     * @param string|null $answer The student's text answer
     * @return array{score: int, feedback: string|null, metadata: array}
     */
    public function evaluateText(Question $question, ?string $answer): array
    {
        // Edge case: Answer is missing or empty
        if ($answer === null || trim($answer) === '') {
            return [
                'score' => 0,
                'feedback' => 'No answer provided.',
                'metadata' => ['reason' => 'empty_answer'],
            ];
        }

        // Try to evaluate with retries
        $attempts = 0;
        $lastError = null;

        while ($attempts <= $this->maxRetries) {
            try {
                $result = $this->callAiEvaluator($question, $answer);
                
                if ($result['success']) {
                    return [
                        'score' => $result['score'],
                        'feedback' => $result['feedback'],
                        'metadata' => $result['metadata'] ?? [],
                    ];
                }

                $lastError = $result['error'] ?? 'Unknown error';
            } catch (\Exception $e) {
                $lastError = $e->getMessage();
                Log::warning("AI evaluation attempt {$attempts} failed for question {$question->id}: {$lastError}");
            }

            $attempts++;
        }

        // All retries exhausted
        Log::error("AI evaluation failed after {$this->maxRetries} retries for question {$question->id}: {$lastError}");
        
        return [
            'score' => 0,
            'feedback' => 'Evaluation failed. Your answer will be reviewed manually.',
            'metadata' => [
                'reason' => 'ai_evaluation_failed',
                'error' => $lastError,
                'retries' => $attempts - 1,
            ],
        ];
    }

    /**
     * Call the AI evaluator service for text question evaluation.
     * Uses the /evaluate endpoint with mode=placement to indicate placement question evaluation.
     */
    private function callAiEvaluator(Question $question, string $answer): array
    {
        // Check evaluator health first
        if (!$this->isEvaluatorAvailable()) {
            Log::info("Evaluator unavailable for question {$question->id}, using fallback scoring");
            return $this->evaluateTextFallbackResult($question, $answer);
        }

        $start = microtime(true);

        try {
            // Use /evaluate endpoint (the only one available) with placement context
            $response = Http::connectTimeout($this->connectTimeout)
                ->timeout($this->totalTimeout)
                ->asJson()
                ->post("{$this->evaluatorUrl}/evaluate", [
                    'repo_url' => 'https://github.com/placement/question', // Placeholder for placement
                    'answer_text' => $answer,
                    'task_title' => "Placement Question: {$question->question_text}",
                    'task_description' => "Evaluate this placement test answer for a {$question->level} level {$question->domain} question.",
                    'student_run_status' => 'N/A',
                    'known_issues' => '',
                ]);

            $elapsedMs = (int) round((microtime(true) - $start) * 1000);

            if (!$response->successful()) {
                // Try to parse error response
                $errorData = [];
                try {
                    $errorData = $response->json();
                } catch (\Throwable $t) {
                    // ignore
                }

                $errorReason = $errorData['error']['reason'] ?? null;
                
                // If AI is disabled, use fallback scoring instead of failing
                if ($errorReason === 'ai_disabled' || $response->status() === 503) {
                    Log::info("AI disabled for question {$question->id}, using fallback scoring");
                    return $this->evaluateTextFallbackResult($question, $answer);
                }

                // For 404 (endpoint not found), use fallback
                if ($response->status() === 404) {
                    Log::warning("Evaluator endpoint not found for question {$question->id}, using fallback scoring");
                    return $this->evaluateTextFallbackResult($question, $answer);
                }

                return [
                    'success' => false,
                    'error' => $errorData['error']['message'] ?? "HTTP {$response->status()}",
                ];
            }

            $data = $response->json();

            // Handle success response
            if ($data['success'] ?? false) {
                $evaluation = $data['data'] ?? [];
                
                // Map task evaluation response to question evaluation format
                // /evaluate returns total_score (0-100) and summary
                $totalScore = (int) ($evaluation['total_score'] ?? $evaluation['score'] ?? 0);
                $feedback = $evaluation['summary'] ?? $evaluation['feedback'] ?? null;
                
                return [
                    'success' => true,
                    'score' => $totalScore,
                    'feedback' => $feedback,
                    'metadata' => [
                        'evaluator_elapsed_ms' => $elapsedMs,
                        'evaluation_source' => 'ai',
                    ],
                ];
            }

            // Handle error response - check for ai_disabled
            $errorReason = $data['error']['reason'] ?? null;
            if ($errorReason === 'ai_disabled') {
                Log::info("AI disabled in response for question {$question->id}, using fallback scoring");
                return $this->evaluateTextFallbackResult($question, $answer);
            }

            return [
                'success' => false,
                'error' => $data['error']['message'] ?? 'Unknown evaluator error',
            ];

        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            return [
                'success' => false,
                'error' => 'Connection timeout: ' . $e->getMessage(),
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Check if the evaluator service is available.
     */
    public function isEvaluatorAvailable(): bool
    {
        try {
            $response = Http::timeout($this->healthTimeout)->get("{$this->evaluatorUrl}/health");
            return $response->successful();
        } catch (\Exception $e) {
            Log::warning("Evaluator health check failed: {$e->getMessage()}");
            return false;
        }
    }

    /**
     * Fallback evaluation for text questions when AI is unavailable.
     * Uses simple heuristics based on answer length and keywords.
     */
    public function evaluateTextFallback(Question $question, string $answer): array
    {
        $wordCount = str_word_count($answer);
        $charCount = strlen($answer);

        // Very short answers get low scores
        if ($wordCount < 10) {
            return [
                'score' => 20,
                'feedback' => 'Your answer is too brief. Please provide more detail.',
                'metadata' => ['evaluation_method' => 'fallback_heuristic'],
            ];
        }

        // Moderate length answers
        if ($wordCount < 30) {
            return [
                'score' => 50,
                'feedback' => 'Your answer shows some understanding. Consider expanding on key concepts.',
                'metadata' => ['evaluation_method' => 'fallback_heuristic'],
            ];
        }

        // Longer, more detailed answers
        return [
            'score' => 70,
            'feedback' => 'Your answer appears comprehensive. AI evaluation was unavailable for detailed feedback.',
            'metadata' => ['evaluation_method' => 'fallback_heuristic'],
        ];
    }

    /**
     * Helper: Return fallback result in the format expected by callAiEvaluator callers.
     */
    private function evaluateTextFallbackResult(Question $question, string $answer): array
    {
        $fallback = $this->evaluateTextFallback($question, $answer);
        return [
            'success' => true,
            'score' => $fallback['score'],
            'feedback' => $fallback['feedback'],
            'metadata' => array_merge($fallback['metadata'], ['evaluation_source' => 'fallback']),
        ];
    }
}
