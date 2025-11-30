<?php

namespace App\Modules\Assessment\Application\Services;

use App\Models\User;
use App\Modules\Assessment\Infrastructure\Models\Question;
use App\Modules\Assessment\Infrastructure\Models\QuestionAttempt;
use App\Modules\Assessment\Infrastructure\Models\PlacementResult;
use App\Modules\AI\Infrastructure\Models\AiLog;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class PlacementService
{
    /**
     * Get a set of questions for the placement test for this user.
     */
    public function getQuestionsForUser(User $user): array
    {
        $query = Question::query();

        // If you want to filter by user domain/level and your questions table supports it,
        // uncomment and adapt the following:
        // if ($user->domain) {
        //     $query->where('domain', $user->domain);
        // }

        $questions = $query->inRandomOrder()->limit(10)->get();

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

            // AI hook placeholder (optional)
            // AiLog::create([...]);

            return [
                'placement_result_id' => $placementResult->id,
                'score'               => 0, // AI will update later
                'suggested_level'     => $suggestedLevel,
                'suggested_domain'    => $suggestedDomain,
                'total_questions'     => $total,
                'correct_count'       => 0, // AI will update later
            ];
        });
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
