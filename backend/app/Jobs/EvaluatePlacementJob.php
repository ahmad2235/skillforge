<?php

namespace App\Jobs;

use App\Modules\Assessment\Infrastructure\Models\PlacementResult;
use App\Modules\Assessment\Infrastructure\Models\QuestionAttempt;
use App\Modules\Assessment\Application\Services\QuestionEvaluationService;
use App\Modules\Assessment\Application\Services\PlacementService;
use App\Notifications\PlacementResultNotification;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class EvaluatePlacementJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $placementResultId;

    public int $tries = 3;

    // Allow long-running evaluations (evaluator may take time)
    public int $timeout = 300; // seconds

    // Backoff between retries
    public int $backoff = 60; // seconds

    public function __construct(int $placementResultId)
    {
        $this->placementResultId = $placementResultId;
    }

    public function handle(QuestionEvaluationService $evaluator, PlacementService $placementService)
    {
        // Allow long-running CLI execution for evaluator calls
        if (function_exists('set_time_limit')) {
            @set_time_limit(0);
        }

        // Use transaction to ensure consistent updates
        return DB::transaction(function () use ($evaluator, $placementService) {
            $placement = PlacementResult::find($this->placementResultId);

            if (!$placement) {
                Log::warning("EvaluatePlacementJob: placement {$this->placementResultId} not found");
                return;
            }

            // Mark processing
            $placement->update([
                'status' => 'processing',
                'evaluation_started_at' => now(),
                'details' => array_merge($placement->details ?? [], ['evaluation_status' => 'processing']),
            ]);

            $user = $placement->user;
            $answers = $placement->pending_answers ?? [];

            $totalScore = 0;
            $correctCount = 0;
            $mcqCount = 0;
            $textCount = 0;
            $questionResults = [];
            $attempts = collect();

            // Load all questions involved
            $questionIds = collect($answers)->pluck('question_id')->unique()->toArray();
            $questions = \App\Modules\Assessment\Infrastructure\Models\Question::whereIn('id', $questionIds)->get()->keyBy('id');

            foreach ($answers as $answerData) {
                $questionId = (int) ($answerData['question_id'] ?? 0);
                $answerText = $answerData['answer'] ?? '';
                $question = $questions->get($questionId);

                if (!$question) {
                    Log::warning("EvaluatePlacementJob: question {$questionId} not found for placement {$placement->id}");
                    continue;
                }

                // Use the same evaluation logic as the PlacementService
                if ($question->type === 'mcq') {
                    $evaluation = $evaluator->evaluateMcq($question, $answerText);
                } else {
                    $evaluation = $evaluator->evaluateText($question, $answerText);
                    if (($evaluation['metadata']['reason'] ?? null) === 'ai_evaluation_failed' && !empty($answerText)) {
                        $fallback = $evaluator->evaluateTextFallback($question, $answerText);
                        $evaluation = array_merge($evaluation, [
                            'score' => $fallback['score'],
                            'feedback' => ($fallback['feedback'] ?? '') . ' ' . ($evaluation['feedback'] ?? ''),
                            'metadata' => array_merge($evaluation['metadata'] ?? [], $fallback['metadata'] ?? []),
                        ]);
                    }
                }

                $attempt = QuestionAttempt::create([
                    'user_id' => $user->id,
                    'placement_result_id' => $placement->id,
                    'question_id' => $questionId,
                    'answer_text' => $answerText,
                    'answer' => $answerText,
                    'score' => $evaluation['score'],
                    'is_correct' => $evaluation['is_correct'] ?? ($evaluation['score'] >= 70),
                    'ai_feedback' => $evaluation['feedback'] ?? null,
                    'metadata' => $evaluation['metadata'] ?? null,
                ]);

                $attempts->push($attempt);
                $totalScore += $evaluation['score'];
                if ($evaluation['is_correct'] ?? ($evaluation['score'] >= 70)) {
                    $correctCount++;
                }
                if ($question->type === 'mcq') {
                    $mcqCount++;
                } else {
                    $textCount++;
                }

                $questionResults[] = [
                    'question_id' => $questionId,
                    'question_text' => $question->question_text,
                    'type' => $question->type,
                    'score' => $evaluation['score'],
                    'is_correct' => $evaluation['is_correct'] ?? ($evaluation['score'] >= 70),
                    'feedback' => $evaluation['feedback'] ?? null,
                ];
            }

            $evaluatedCount = $attempts->count();
            $overallScore = $evaluatedCount > 0 ? (int) round($totalScore / $evaluatedCount) : 0;
            $suggestedLevel = $placementService->inferLevelFromScore($overallScore);

            // Update placement with results
            $placement->update([
                'overall_score' => $overallScore,
                'final_level' => $suggestedLevel,
                'details' => array_merge($placement->details ?? [], [
                    'evaluation_completed_at' => now()->toIso8601String(),
                    'evaluated_count' => $evaluatedCount,
                    'correct_count' => $correctCount,
                    'mcq_count' => $mcqCount,
                    'text_count' => $textCount,
                    'total_score_sum' => $totalScore,
                    'question_results' => $questionResults,
                    'evaluation_status' => 'completed',
                ]),
                'status' => 'completed',
                'evaluation_completed_at' => now(),
                'pending_answers' => null,
            ]);

            // Update user's profile
            $user->level = $suggestedLevel;
            $user->domain = $placement->final_domain;
            $user->save();

            // Generate roadmap for user
            $roadmap = $placementService->generateRoadmapFromPlacement($user, $placement);

            // Log and notify
            Log::info('EvaluatePlacementJob completed', ['placement' => $placement->id, 'score' => $overallScore]);

            if (config('skillforge.notifications.enabled') && config('skillforge.notifications.placement_result')) {
                $user->notify(new PlacementResultNotification($placement));
            }
        });
    }

    public function failed(\Throwable $exception)
    {
        Log::error('EvaluatePlacementJob failed', ['placement' => $this->placementResultId, 'error' => $exception->getMessage()]);

        $placement = PlacementResult::find($this->placementResultId);
        if ($placement) {
            $placement->update([
                'status' => 'failed',
                'details' => array_merge($placement->details ?? [], ['evaluation_status' => 'failed', 'error' => $exception->getMessage()]),
            ]);
        }
    }
}
