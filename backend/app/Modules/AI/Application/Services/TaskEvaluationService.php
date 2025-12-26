<?php

namespace App\Modules\AI\Application\Services;

use App\Modules\Learning\Infrastructure\Models\Submission;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TaskEvaluationService
{
    private string $evaluatorUrl;
    private int $connectTimeout;
    private int $totalTimeout;
    private int $healthTimeout;

    public function __construct()
    {
        $this->evaluatorUrl = config('services.evaluator.url', 'http://127.0.0.1:8001');
        $this->connectTimeout = config('services.evaluator.connect_timeout', 5);
        $this->totalTimeout = config('services.evaluator.timeout', 15);
        $this->healthTimeout = config('services.evaluator.health_timeout', 3);
    }

    /**
     * Check if evaluator service is available.
     * 
     * @return bool
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
        // Prepare submission data for JSON-based evaluation (no file upload)
        $taskTitle = $submission->task->title ?? 'Task submission';
        $taskDescription = $submission->task->description ?? 'Project submission';
        $repoUrl = $submission->attachment_url; // GitHub repo URL
        $answerText = $submission->answer_text ?? '';
        $studentRunStatus = $submission->metadata['student_run_status'] ?? ($submission->metadata['run_status'] ?? 'Not specified');
        $knownIssues = $submission->metadata['known_issues'] ?? '';

        // Validate repo URL if task requires attachment (do this before contacting evaluator)
        $requiresAttachment = $submission->task->metadata['requires_attachment'] ?? false;
        if ($requiresAttachment && empty($repoUrl)) {
            Log::warning("Evaluator: GitHub repo URL missing for submission {$submission->id}");
            return [
                'status' => 'unavailable',
                'score' => null,
                'feedback' => 'Task requires a GitHub repository URL. Please re-submit with repo URL.',
                'metadata' => ['reason' => 'missing_repo_url', 'evaluation_outcome' => 'manual_review'],
            ];
        }

        // If a local provider is bound, prefer it (useful for tests)
        if (app()->bound(\App\Modules\AI\Providers\AiProviderInterface::class)) {
            try {
                $provider = app(\App\Modules\AI\Providers\AiProviderInterface::class);
                $result = $provider->evaluate($submission);

                $meta = $result['metadata'] ?? $result;
                // Detect provider indicating AI disabled (test mode or config)
                if (($meta['meta']['ai_disabled'] ?? false) === true || ($meta['ai_disabled'] ?? false) === true || ($meta['reason'] ?? null) === 'ai_disabled') {
                    return [
                        'status' => 'unavailable',
                        'score' => null,
                        'feedback' => 'AI evaluation is disabled. Manual review required.',
                        'metadata' => array_merge($meta, ['evaluation_outcome' => 'manual_review', 'reason' => 'ai_disabled']),
                    ];
                }

                // Ensure defaults for provider-returned metadata on success
                if (!isset($meta['reason']) || $meta['reason'] === null) {
                    $meta['reason'] = 'ok';
                }
                if (!isset($meta['evaluation_outcome']) || $meta['evaluation_outcome'] === null) {
                    $meta['evaluation_outcome'] = 'ai_completed';
                }

                // Preserve rubric_scores from provider and map per-criterion to legacy keys
                $providerRubric = null;
                if (isset($result['rubric_scores']) && is_array($result['rubric_scores'])) {
                    $providerRubric = $result['rubric_scores'];
                } elseif (isset($meta['rubric_scores']) && is_array($meta['rubric_scores'])) {
                    $providerRubric = $meta['rubric_scores'];
                }

                if ($providerRubric !== null) {
                    $meta['rubric_scores'] = $providerRubric;

                    foreach ($providerRubric as $r) {
                        $criterion = strtolower(str_replace(' ', '_', $r['criterion'] ?? ''));
                        $scoreVal = $r['score'] ?? null;
                        if ($scoreVal === null) continue;

                        if (strpos($criterion, 'functional') !== false && !isset($meta['functional_score'])) {
                            $meta['functional_score'] = $scoreVal;
                        }

                        if ((strpos($criterion, 'code') !== false || strpos($criterion, 'quality') !== false) && !isset($meta['code_quality_score'])) {
                            $meta['code_quality_score'] = $scoreVal;
                        }
                    }

                    // If provider didn't provide a top-level score, derive from rubric sum
                    if (!isset($result['score']) || $result['score'] === null) {
                        $sum = array_reduce($providerRubric, fn($acc, $r) => $acc + (($r['score'] ?? 0)), 0);
                        $result['score'] = $sum;
                    }
                }

                return [
                    'status' => 'completed',
                    'score' => $result['score'] ?? null,
                    'feedback' => $result['feedback'] ?? null,
                    'metadata' => $meta,
                ];
            } catch (\Exception $e) {
                Log::error("Local AI provider error for submission {$submission->id}: {$e->getMessage()}");
                // continue to evaluator service fallback
            }
        }

        // If there is no content (no repo URL and no answer text) and no provider, mark as skipped (no evaluation possible)
        if (empty($repoUrl) && empty($answerText)) {
            return [
                'status' => 'unavailable',
                'score' => null,
                'feedback' => 'No GitHub repo URL or answer provided. This task can be reviewed manually.',
                'metadata' => ['reason' => 'no_content', 'evaluation_outcome' => 'skipped'],
            ];
        }

        // Check evaluator availability first
        if (!$this->isEvaluatorAvailable()) {
            Log::warning("Evaluator service unavailable for submission {$submission->id}");
            return [
                'status' => 'unavailable',
                'score' => null,
                'feedback' => 'AI evaluator is currently unavailable. Your submission will be reviewed manually.',
                'metadata' => [
                    'reason' => 'healthcheck_failed',
                    'at' => now()->toISOString(),
                ],
            ];
        }

        try {
            // Call the evaluator service with JSON body and strict timeouts
            $start = microtime(true);
            $response = Http::connectTimeout($this->connectTimeout)
                ->timeout($this->totalTimeout)
                ->asJson()
                ->post("{$this->evaluatorUrl}/evaluate", [
                    'repo_url' => $repoUrl,
                    'answer_text' => $answerText,
                    'student_run_status' => $studentRunStatus,
                    'task_title' => $taskTitle,
                    'task_description' => $taskDescription,
                    'known_issues' => $knownIssues,
                ]);
            $elapsedMs = (int) round((microtime(true) - $start) * 1000);

            if (!$response->successful()) {
                // Attempt to detect ai_disabled from error payload even on non-200 responses
                $payload = [];
                try { $payload = $response->json(); } catch (\Throwable $t) { $payload = []; }
                $err = $payload['error'] ?? [];
                $errReason = $err['reason'] ?? null;
                if ($errReason === 'ai_disabled') {
                    return [
                        'status' => 'unavailable',
                        'score' => null,
                        'feedback' => 'AI evaluation is disabled. Manual review required.',
                        'metadata' => [
                            'evaluation_outcome' => 'manual_review',
                            'reason' => 'ai_disabled',
                            'ai_disabled' => true,
                            'status' => $response->status(),
                            'evaluator_elapsed_ms' => $elapsedMs,
                            'evaluator_http_status' => $response->status(),
                            'evaluator_timeout_seconds' => $this->totalTimeout,
                            'at' => now()->toISOString(),
                        ],
                    ];
                }

                Log::error("Evaluator API error: {$response->status()} - {$response->body()}");
                return [
                    'status' => 'unavailable',
                    'score' => null,
                    'feedback' => 'AI evaluator is currently unavailable. Your submission will be reviewed manually.',
                    'metadata' => [
                        'reason' => 'api_error',
                        'status' => $response->status(),
                        'evaluator_elapsed_ms' => $elapsedMs,
                        'evaluator_http_status' => $response->status(),
                        'evaluator_timeout_seconds' => $this->totalTimeout,
                        'at' => now()->toISOString(),
                    ],
                ];
            }

            $data = $response->json();

            // Check for explicit error responses (ai_disabled, provider_error, etc.)
            if (!($data['success'] ?? false)) {
                $error = $data['error'] ?? [];
                $errorType = $error['type'] ?? 'unknown_error';
                $errorReason = $error['reason'] ?? 'unknown';
                
                // ai_disabled is a special case - don't call it "failed", it's manual_review
                if ($errorType === 'ai_disabled' || $errorReason === 'ai_disabled') {
                    return [
                        'status' => 'unavailable',
                        'score' => null,
                        'feedback' => 'AI evaluation is disabled. Manual review required.',
                        'metadata' => [
                            'evaluation_outcome' => 'manual_review',
                            'reason' => 'ai_disabled',
                            'ai_disabled' => true,
                            'error_type' => $errorType,
                        ],
                    ];
                }
                
                // Other errors -> failed evaluation, still manual review
                Log::error("Evaluator returned success=false with reason: {$errorReason}");
                return [
                    'status' => 'unavailable',
                    'score' => null,
                    'feedback' => 'Evaluation failed. Your submission will be reviewed manually.',
                    'metadata' => [
                        'evaluation_outcome' => 'failed',
                        'reason' => $errorReason,
                        'error_type' => $errorType,
                        'at' => now()->toISOString(),
                    ],
                ];
            }

            $evaluation = $data['data'] ?? [];

            // Legacy check: Detect evaluator indicating AI disabled via response data (backward compat)
            $meta = $evaluation['meta'] ?? (is_array($evaluation) ? $evaluation : []);
            $aiDisabledMeta = ($meta['ai_disabled'] ?? false) === true || ($meta['reason'] ?? null) === 'ai_disabled' || ($evaluation['ai_disabled'] ?? false) === true;
            if ($aiDisabledMeta) {
                return [
                    'status' => 'unavailable',
                    'score' => null,
                    'feedback' => 'AI evaluation is disabled. Manual review required.',
                    'metadata' => array_merge((array) $meta, ['evaluation_outcome' => 'manual_review', 'reason' => 'ai_disabled', 'evaluator_elapsed_ms' => $elapsedMs, 'evaluator_http_status' => $response->status(), 'evaluator_timeout_seconds' => $this->totalTimeout]),
                ];
            }

            // Ensure strict meta defaults for success path (do not overwrite existing values)
            if (!isset($meta['reason']) || $meta['reason'] === null) {
                $meta['reason'] = 'ok';
            }
            if (!isset($meta['evaluation_outcome']) || $meta['evaluation_outcome'] === null) {
                $meta['evaluation_outcome'] = 'ai_completed';
            }
            if (!isset($evaluation['semantic_status']) || $evaluation['semantic_status'] === null) {
                $evaluation['semantic_status'] = 'completed';
            }

            // Timing and HTTP info (add only when not provided)
            $meta['evaluator_elapsed_ms'] = $meta['evaluator_elapsed_ms'] ?? $elapsedMs;
            $meta['evaluator_http_status'] = $meta['evaluator_http_status'] ?? $response->status();
            $meta['evaluator_timeout_seconds'] = $meta['evaluator_timeout_seconds'] ?? $this->totalTimeout;

            // Persist meta back into evaluation payload
            $evaluation['meta'] = $meta;

            // Normalize rubric_scores -> legacy per-category fields for backward compatibility
            $rubricSource = null;
            // Search for rubric_scores in several common nesting locations to be robust
            if (!empty($evaluation['rubric_scores']) && is_array($evaluation['rubric_scores'])) {
                $rubricSource = $evaluation['rubric_scores'];
            } elseif (!empty($evaluation['meta']['rubric_scores']) && is_array($evaluation['meta']['rubric_scores'])) {
                $rubricSource = $evaluation['meta']['rubric_scores'];
            } elseif (!empty($meta['rubric_scores']) && is_array($meta['rubric_scores'])) {
                $rubricSource = $meta['rubric_scores'];
            } elseif (!empty($evaluation['meta']['meta']['rubric_scores']) && is_array($evaluation['meta']['meta']['rubric_scores'])) {
                $rubricSource = $evaluation['meta']['meta']['rubric_scores'];
            } elseif (!empty($meta['meta']['rubric_scores']) && is_array($meta['meta']['rubric_scores'])) {
                $rubricSource = $meta['meta']['rubric_scores'];
            }

            if ((!isset($evaluation['functional_score']) || !isset($evaluation['code_quality_score'])) && $rubricSource !== null) {
                $func = null; $codeq = null;
                foreach ($rubricSource as $r) {
                    $criterion = strtolower(str_replace(' ', '_', $r['criterion'] ?? ''));
                    $scoreVal = $r['score'] ?? null;
                    if ($scoreVal === null) continue;

                    if (strpos($criterion, 'functional') !== false && $func === null) $func = $scoreVal;
                    if ((strpos($criterion, 'code') !== false || strpos($criterion, 'quality') !== false) && $codeq === null) $codeq = $scoreVal;
                }

                if ($func !== null) $evaluation['functional_score'] = $evaluation['functional_score'] ?? $func;
                if ($codeq !== null) $evaluation['code_quality_score'] = $evaluation['code_quality_score'] ?? $codeq;

                // Ensure total_score equals sum of category scores when available
                $sum = 0;
                if (isset($evaluation['functional_score'])) $sum += (int)$evaluation['functional_score'];
                if (isset($evaluation['code_quality_score'])) $sum += (int)$evaluation['code_quality_score'];
                if ($sum > 0) $evaluation['total_score'] = $sum;

                // Also persist rubric into meta for consistency and top-level so persister finds it
                $evaluation['meta']['rubric_scores'] = $rubricSource;
                $evaluation['rubric_scores'] = $rubricSource;
            }

            // Final fallback: if category scores missing but we have a total_score, split into functional/code-quality deterministically
            if ((empty($evaluation['functional_score']) && empty($evaluation['code_quality_score'])) && isset($evaluation['total_score'])) {
                $total = (int)$evaluation['total_score'];
                // Give functional the first 70 points, remainder to code quality up to 30
                $func = min(70, $total);
                $codeq = max(0, min(30, $total - $func));

                $evaluation['functional_score'] = $func;
                $evaluation['code_quality_score'] = $codeq;

                // Build a minimal rubric_scores structure so persistence and UI can consume it
                if (empty($evaluation['rubric_scores'])) {
                    $evaluation['rubric_scores'] = [
                        ['criterion' => 'Functional', 'score' => $func, 'max_points' => 70],
                        ['criterion' => 'Code Quality', 'score' => $codeq, 'max_points' => 30],
                    ];
                }
                if (empty($evaluation['meta']['rubric_scores'])) {
                    $evaluation['meta']['rubric_scores'] = $evaluation['rubric_scores'];
                }
            }

            // Extract score and feedback
            $score = $evaluation['total_score'] ?? null;
            $feedback = $this->buildFeedback($evaluation);

            return [
                'status' => 'completed',
                'score' => $score,
                'feedback' => $feedback,
                'metadata' => $evaluation, // Store full evaluation for later analysis
            ];

        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            Log::error("TaskEvaluationService timeout: {$e->getMessage()}");
            return [
                'status' => 'unavailable',
                'score' => null,
                'feedback' => 'Evaluation timed out. Your submission will be reviewed manually.',
                'metadata' => [
                    'reason' => 'evaluator_timeout',
                    'error' => $e->getMessage(),
                    'evaluation_outcome' => 'manual_review',
                    'evaluator_timeout_seconds' => $this->totalTimeout,
                    'at' => now()->toISOString(),
                ],
            ];
        } catch (\Exception $e) {
            Log::error("TaskEvaluationService error: {$e->getMessage()}");
            return [
                'status' => 'unavailable',
                'score' => null,
                'feedback' => 'AI evaluator encountered an error. Your submission will be reviewed manually.',
                'metadata' => [
                    'reason' => 'exception',
                    'error' => $e->getMessage(),
                    'evaluation_outcome' => 'manual_review',
                    'at' => now()->toISOString(),
                ],
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

        // Scores (check both top-level and meta)
        $meta = $evaluation['meta'] ?? $evaluation;
        $funcScore = $evaluation['functional_score'] ?? $meta['functional_score'] ?? 0;
        $codeScore = $evaluation['code_quality_score'] ?? $meta['code_quality_score'] ?? 0;
        $totalScore = $evaluation['total_score'] ?? $meta['total_score'] ?? 0;
        
        $parts[] = sprintf(
            'Functional: %d/70 | Code Quality: %d/30 | Total: %d/100',
            $funcScore,
            $codeScore,
            $totalScore
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
            $parts[] = "Summary: " . $summary;
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
