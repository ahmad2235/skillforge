<?php

namespace App\Modules\Learning\Interface\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Learning\Application\Services\RoadmapService;
use App\Modules\Learning\Infrastructure\Models\Submission;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class TaskController extends Controller
{
    public function __construct(
        private readonly RoadmapService $roadmapService
    ) {}

    /**
     * Get tasks for a specific block
     */
    public function listByBlock(int $blockId)
    {
        $user = Auth::user();

        $tasks = $this->roadmapService->getTasksForBlock($user, $blockId);

        return response()->json([
            'data' => $tasks,
        ]);
    }

    /**
     * Student submits a task solution
     */
    public function submit(Request $request, int $taskId)
    {
        $request->validate([
            'answer_text'    => 'nullable|string',
            'attachment_url' => 'nullable|url',
            'run_status'     => 'nullable|string',
            'known_issues'   => 'nullable|string',
        ]);

        $user = Auth::user();

        $result = $this->roadmapService->submitTask($user, $taskId, $request->only([
            'answer_text',
            'attachment_url',
            'run_status',
            'known_issues',
        ]));

        return response()->json([
            'message'    => 'Task submitted successfully.',
            'submission' => $result['submission'],
        ], 201);
    }

    /**
     * Get submission details with evaluation results
     */
    public function getSubmission(int $submissionId)
    {
        $user = Auth::user();

        $submission = Submission::with(['task', 'user'])
            ->findOrFail($submissionId);

        // Ensure user can only view their own submissions
        if ($submission->user_id !== $user->id && $user->role !== 'admin') {
            abort(403, 'Unauthorized');
        }

        return response()->json([
            'data' => [
                'id'          => $submission->id,
                'task_id'     => $submission->task_id,
                'answer_text' => $submission->answer_text,
                'attachment_url' => $submission->attachment_url,
                'status'      => $submission->status,
                'score'       => $submission->score,
                'ai_score'    => $submission->ai_score,
                'ai_feedback' => $submission->ai_feedback,
                'ai_metadata' => $submission->ai_metadata,
                'is_evaluated' => $submission->is_evaluated,
                'submitted_at' => $submission->submitted_at,
                'evaluated_at' => $submission->evaluated_at,
                'task'        => $submission->task,
            ],
        ]);
    }
}
