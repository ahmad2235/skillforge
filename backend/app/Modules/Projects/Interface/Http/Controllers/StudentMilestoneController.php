<?php

namespace App\Modules\Projects\Interface\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Projects\Application\Services\ProjectMilestoneSubmissionService;
use App\Modules\Projects\Infrastructure\Models\ProjectAssignment;
use App\Modules\Projects\Infrastructure\Models\ProjectMilestone;
use App\Modules\Projects\Interface\Http\Requests\SubmitProjectMilestoneRequest;
use Illuminate\Support\Facades\Auth;

class StudentMilestoneController extends Controller
{
    public function __construct(
        private readonly ProjectMilestoneSubmissionService $submissionService,
    ) {}

    public function index(int $assignmentId)
    {
        $student = Auth::user();

        $assignment = ProjectAssignment::with(['project'])
            ->findOrFail($assignmentId);

        if ($assignment->user_id !== $student->id) {
            abort(403, 'You are not allowed to view this assignment.');
        }

        $milestones = $this->submissionService->listMilestonesForAssignment($assignment)
            ->map(function ($milestone) {
                $submission = $milestone->submissions->first();

                return [
                    'id'            => $milestone->id,
                    'title'         => $milestone->title,
                    'description'   => $milestone->description,
                    'order_index'   => $milestone->order_index,
                    'due_date'      => $milestone->due_date ? $milestone->due_date->toDateString() : null,
                    'is_required'   => (bool) $milestone->is_required,
                    'submission'    => $submission ? [
                        'id'             => $submission->id,
                        'status'         => $submission->status,
                        'answer_text'    => $submission->answer_text,
                        'attachment_url' => $submission->attachment_url,
                        'review_feedback'=> $submission->review_feedback,
                    ] : null,
                ];
            });

        return response()->json([
            'data' => $milestones,
        ]);
    }

    public function submit(SubmitProjectMilestoneRequest $request, int $assignmentId, int $milestoneId)
    {
        $student = Auth::user();

        $assignment = ProjectAssignment::with(['project'])
            ->findOrFail($assignmentId);

        if ($assignment->user_id !== $student->id) {
            abort(403, 'You are not allowed to submit for this assignment.');
        }

        $milestone = ProjectMilestone::findOrFail($milestoneId);

        if ($milestone->project_id !== $assignment->project_id) {
            abort(422, 'Milestone does not belong to this assignment.');
        }

        $submission = $this->submissionService->submitMilestone(
            $student,
            $assignment,
            $milestone,
            $request->validated()
        );

        return response()->json([
            'message' => 'Milestone submitted.',
            'data'    => $submission,
        ], 201);
    }
}
