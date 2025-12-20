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

class PlacementService
{
    public function __construct(
        private readonly AiLogger $aiLogger
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
            return [
                'id'            => $q->id,
                'question_text' => $q->question_text,
                'level'         => $q->level,
                'domain'        => $q->domain,
                'type'          => $q->type,
                'difficulty'    => $q->difficulty,
                'metadata'      => $q->metadata,
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

            // Load all involved questions
            $questions = Question::whereIn('id', $answers->pluck('question_id'))->get()->keyBy('id');

            $total = $answers->count();

            $suggestedDomain = $data['domain'] ?? $user->domain ?? 'frontend';
            // For now, start with beginner; AI scoring can update later
            $suggestedLevel = 'beginner';

            // 1) Create PlacementResult first (required FK for question_attempts)
            $placementResult = PlacementResult::create([
                'user_id'       => $user->id,
                'final_level'   => $suggestedLevel,
                'final_domain'  => $suggestedDomain,
                'overall_score' => 0, // placeholder, AI can update later
                'details'       => [
                    'total_questions' => $total,
                    'correct_count'   => 0,
                ],
                'is_active'     => true,
            ]);

            // 2) Create QuestionAttempt records with the placement_result_id
            $attempts = collect();

            foreach ($answers as $answer) {
                $questionId = (int) $answer['question_id'];
                $answerText = $answer['answer'];

                $attempt = QuestionAttempt::create([
                    'user_id'            => $user->id,
                    'placement_result_id'=> $placementResult->id,
                    'question_id'        => $questionId,
                    'answer_text'        => $answerText,
                    'score'              => null, // AI will evaluate later
                    'ai_feedback'        => null,
                    'metadata'           => null,
                ]);

                $attempts->push($attempt);
            }

            // Update user profile with suggested values
            $user->level = $suggestedLevel;
            $user->domain = $suggestedDomain;
            $user->save();

            $roadmap = $this->generateRoadmapFromPlacement($user, $placementResult);

            $this->aiLogger->log(
                'placement.submit',
                $user->id,
                [
                    'answers_count' => $total,
                    'domain'        => $suggestedDomain,
                ],
                [
                    'final_level'   => $suggestedLevel,
                    'final_domain'  => $suggestedDomain,
                    'placement_id'  => $placementResult->id,
                    'recommended_block_ids' => $roadmap['block_ids'],
                ],
                [
                    'placement_result_id' => $placementResult->id,
                ]
            );

            if (config('skillforge.notifications.enabled') && config('skillforge.notifications.placement_result')) {
                $user->notify(new PlacementResultNotification($placementResult));
            }

            return [
                'placement_result_id' => $placementResult->id,
                'score'               => 0, // AI will update later
                'suggested_level'     => $suggestedLevel,
                'suggested_domain'    => $suggestedDomain,
                'total_questions'     => $total,
                'correct_count'       => 0, // AI will update later
                'recommended_blocks_count' => $roadmap['count'],
                'recommended_block_ids'    => $roadmap['block_ids'],
            ];
        });
    }

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

    private function inferLevelFromScore(int $score): string
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
