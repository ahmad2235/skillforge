<?php

namespace App\Modules\Assessment\Application\Services;

use App\Models\User;
use App\Modules\Assessment\Infrastructure\Models\Question;
use App\Modules\Assessment\Infrastructure\Models\QuestionAttempt;
use App\Modules\Assessment\Infrastructure\Models\PlacementResult;
use App\Modules\AI\Application\Services\AiLogger;
use App\Modules\Learning\Infrastructure\Models\RoadmapBlock;
use App\Modules\Learning\Infrastructure\Models\UserRoadmapBlock;
use App\Notifications\PlacementResultNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PlacementService
{
    public function __construct(
        private readonly AiLogger $aiLogger,
        private readonly QuestionEvaluationService $questionEvaluationService
    ) {}

    /**
     * Get a set of questions for the placement test for this user.
     * Optionally filters by domain and orders by difficulty.
     */
    public function getQuestionsForUser(User $user, ?string $domain = null): array
    {
        $query = Question::query();

        // Filter by user domain if available, or use provided domain parameter
        $filterDomain = $domain ?? $user->domain ?? 'frontend';
        if ($filterDomain) {
            $query->where('domain', $filterDomain);
        }

        $questions = $query
            ->orderBy('difficulty', 'asc')
            ->inRandomOrder()
            ->limit(10)
            ->get();

        return $questions->map(function (Question $q) {
            // For MCQ, include options but NOT the correct_answer
            $metadata = $q->metadata ?? [];
            $safeMetadata = [];
            
            if (isset($metadata['options'])) {
                $safeMetadata['options'] = $metadata['options'];
            }
            
            return [
                'id'            => $q->id,
                'question_text' => $q->question_text,
                'level'         => $q->level,
                'domain'        => $q->domain,
                'type'          => $q->type,
                'difficulty'    => $q->difficulty,
                'metadata'      => $safeMetadata,
            ];
        })->all();
    }

    /**
     * Handle submission of placement answers and return evaluation summary.
     */
    public function submitAnswers(User $user, array $data): array
    {
        return DB::transaction(function () use ($user, $data) {
            $answers = collect($data['answers']);

            // Edge case: No questions submitted
            if ($answers->isEmpty()) {
                Log::warning("User {$user->id} submitted placement with no answers");
                
                $placementResult = PlacementResult::create([
                    'user_id'       => $user->id,
                    'final_level'   => 'beginner',
                    'final_domain'  => $data['domain'] ?? $user->domain ?? 'frontend',
                    'overall_score' => 0,
                    'details'       => [
                        'total_questions' => 0,
                        'correct_count'   => 0,
                        'mcq_count'       => 0,
                        'text_count'      => 0,
                        'evaluation_method' => 'empty_submission',
                    ],
                    'is_active'     => true,
                ]);

                return [
                    'placement_result_id' => $placementResult->id,
                    'score'               => 0,
                    'suggested_level'     => 'beginner',
                    'suggested_domain'    => $placementResult->final_domain,
                    'total_questions'     => 0,
                    'correct_count'       => 0,
                    'question_results'    => [],
                    'recommended_blocks_count' => 0,
                    'recommended_block_ids'    => [],
                ];
            }

            // Load all involved questions
            $questions = Question::whereIn('id', $answers->pluck('question_id'))->get()->keyBy('id');

            $total = $answers->count();
            $suggestedDomain = $data['domain'] ?? $user->domain ?? 'frontend';

            // 1) Create PlacementResult in PENDING state and store answers for background processing
            $placementResult = PlacementResult::create([
                'user_id'       => $user->id,
                'final_level'   => 'beginner', // Will be updated by background job
                'final_domain'  => $suggestedDomain,
                'overall_score' => 0, // Will be updated by background job
                'details'       => [
                    'total_questions' => $total,
                    'correct_count'   => 0,
                    'evaluation_status' => 'pending',
                ],
                'pending_answers' => $answers->toArray(),
                'status'        => 'pending',
                'is_active'     => true,
            ]);

            // Dispatch background job to perform the heavy evaluation
            \App\Jobs\EvaluatePlacementJob::dispatch($placementResult->id)->onQueue('default');

            // Return immediately with pending status (client should poll for result)
            return [
                'placement_result_id' => $placementResult->id,
                'status'               => 'pending',
                'message'              => 'Placement evaluation started and is processing in the background.',
            ];

            // Note: the actual evaluation will be performed asynchronously by EvaluatePlacementJob
            // Answers are stored in the `pending_answers` column and the job will update the result when done.
        });
    }

    /**
     * Evaluate an answer based on question type.
     */
    private function evaluateAnswer(Question $question, ?string $answer): array
    {
        if ($question->type === 'mcq') {
            return $this->questionEvaluationService->evaluateMcq($question, $answer);
        }

        // For text questions, try AI evaluation with fallback
        $result = $this->questionEvaluationService->evaluateText($question, $answer);
        
        // If AI evaluation failed, use fallback heuristic
        if (($result['metadata']['reason'] ?? null) === 'ai_evaluation_failed' && !empty($answer)) {
            $fallback = $this->questionEvaluationService->evaluateTextFallback($question, $answer);
            return array_merge($result, [
                'score' => $fallback['score'],
                'feedback' => $fallback['feedback'] . ' ' . ($result['feedback'] ?? ''),
                'metadata' => array_merge($result['metadata'] ?? [], $fallback['metadata'] ?? []),
            ]);
        }

        return $result;
    }

    /**
     * Generate roadmap blocks for the user based on placement result.
     */
    public function generateRoadmapFromPlacement(User $user, PlacementResult $result): array
    {
        $limit = (int) config('skillforge.placement.recommended_blocks_limit', 6);
        $numAssigned = (int) config('skillforge.placement.num_assigned_blocks', 3);

        $blocks = RoadmapBlock::query()
            ->where('level', $result->final_level)
            ->where('domain', $result->final_domain)
            ->orderBy('order_index')
            ->limit($limit)
            ->get();

        $assignedIds = [];

        foreach ($blocks as $index => $block) {
            UserRoadmapBlock::updateOrCreate(
                [
                    'user_id' => $user->id,
                    'roadmap_block_id' => $block->id,
                ],
                [
                    'status' => $index < $numAssigned ? 'assigned' : 'locked',
                    'started_at' => null,
                    'completed_at' => null,
                ]
            );

            $assignedIds[] = $block->id;
        }

        return [
            'count' => count($assignedIds),
            'block_ids' => $assignedIds,
        ];
    }

    /**
     * Get placement result with detailed question attempts.
     */
    public function getPlacementResult(int $placementResultId, User $user): ?array
    {
        $result = PlacementResult::with('questionAttempts.question')
            ->where('id', $placementResultId)
            ->where('user_id', $user->id)
            ->first();

        if (!$result) {
            return null;
        }

        return [
            'id' => $result->id,
            'overall_score' => $result->overall_score,
            'suggested_level' => $result->final_level,
            'suggested_domain' => $result->final_domain,
            'details' => $result->details,
            'created_at' => $result->created_at->toIso8601String(),
            'question_results' => $result->questionAttempts->map(function ($attempt) {
                return [
                    'question_id' => $attempt->question_id,
                    'question_text' => $attempt->question->question_text ?? null,
                    'question_type' => $attempt->question->type ?? null,
                    'answer' => $attempt->answer_text,
                    'score' => $attempt->score,
                    'is_correct' => $attempt->is_correct,
                    'feedback' => $attempt->ai_feedback,
                ];
            })->toArray(),
        ];
    }

    /**
     * Infer user level from overall placement score.
     */
    public function inferLevelFromScore(int $score): string
    {
        if ($score >= 80) {
            return 'advanced';
        }

        if ($score >= 50) {
            return 'intermediate';
        }

        return 'beginner';
    }
}
