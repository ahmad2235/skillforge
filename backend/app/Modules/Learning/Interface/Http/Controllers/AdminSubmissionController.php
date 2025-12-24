<?php

namespace App\Modules\Learning\Interface\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Learning\Infrastructure\Models\Submission;
use Illuminate\Http\Request;

class AdminSubmissionController extends Controller
{
    public function show(int $submissionId)
    {
        $submission = Submission::with(['task', 'user', 'latestAiEvaluation'])
            ->findOrFail($submissionId);

        $latestAi = $submission->latestAiEvaluationResolved();

        return response()->json([
            'data' => [
                'id' => $submission->id,
                'task_id' => $submission->task_id,
                'answer_text' => $submission->answer_text,
                'attachment_url' => $submission->attachment_url,
                'status' => $submission->status,
                'score' => $submission->score,
                'ai_score' => $submission->ai_score,
                'ai_feedback' => $submission->ai_feedback,
                'ai_metadata' => $submission->ai_metadata,
                'is_evaluated' => $submission->is_evaluated,
                'submitted_at' => $submission->submitted_at,
                'evaluated_at' => $submission->evaluated_at,
                'final_score' => $submission->final_score,
                'rubric_scores' => $submission->rubric_scores,
                'evaluated_by' => $submission->evaluated_by,
                'effective_score' => $submission->effective_score,
                'task' => $submission->task,
                'user' => $submission->user,
                'latest_ai_evaluation' => $latestAi ? [
                    'id' => $latestAi->id,
                    'provider' => $latestAi->provider,
                    'model' => $latestAi->model,
                    'status' => $latestAi->status,
                    'score' => $latestAi->score,
                    'feedback' => $latestAi->feedback,
                    'rubric_scores' => $latestAi->rubric_scores,
                    'completed_at' => $latestAi->completed_at,
                ] : null,
            ],
        ]);
    }
}
