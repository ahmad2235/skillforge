<?php

namespace App\Modules\Projects\Interface\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Projects\Application\Services\ProjectMilestoneSubmissionService;
use App\Modules\Projects\Application\Services\ProjectAssignmentService;
use App\Modules\Projects\Infrastructure\Models\ProjectAssignment;
use App\Modules\Projects\Infrastructure\Models\ProjectMilestone;
use App\Modules\Projects\Interface\Http\Requests\SubmitProjectMilestoneRequest;
use Illuminate\Support\Facades\Auth;
use App\Models\User;

class StudentMilestoneController extends Controller
{
    public function __construct(
        private readonly ProjectMilestoneSubmissionService $submissionService,
        private readonly ProjectAssignmentService $assignmentService,
    ) {}

    public function index(int $assignmentId)
    {
        $student = Auth::user();

        $assignment = ProjectAssignment::with(['project', 'team', 'user'])
            ->findOrFail($assignmentId);

        if ($assignment->user_id !== $student->id) {
            abort(403, 'You are not allowed to view this assignment.');
        }

        $milestones = $this->submissionService->listMilestonesForAssignment($assignment)
            ->map(function ($milestone) use ($student, $assignment) {
                // For team assignments, find student's own submission
                $submission = null;
                if ($assignment->team_id) {
                    $submission = $milestone->submissions->firstWhere('user_id', $student->id);
                } else {
                    $submission = $milestone->submissions->first();
                }

                // Determine if student can submit this milestone
                $canSubmit = true;
                if ($assignment->team_id && $milestone->domain) {
                    $studentDomain = $student->domain;
                    if ($studentDomain !== 'fullstack' && $studentDomain !== $milestone->domain) {
                        $canSubmit = false;
                    }
                }

                return [
                    'id'            => $milestone->id,
                    'title'         => $milestone->title,
                    'description'   => $milestone->description,
                    'order_index'   => $milestone->order_index,
                    'due_date'      => $milestone->due_date ? $milestone->due_date->toDateString() : null,
                    'is_required'   => (bool) $milestone->is_required,
                    'domain'        => $milestone->domain,
                    'can_submit'    => $canSubmit,
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
            'team' => $assignment->team_id ? [
                'id' => $assignment->team->id,
                'name' => $assignment->team->name,
                'status' => $assignment->team->status,
            ] : null,
            'can_submit_assignment' => $this->canStudentSubmitAssignment($student, $assignment),
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

    /**
     * Helper: Check if student can submit/mark assignment ready
     * For solo: always true
     * For team: only if higher score (or backend on tie)
     */
    private function canStudentSubmitAssignment(User $student, ProjectAssignment $assignment): bool
    {
        if (!$assignment->team_id) {
            return true; // Solo assignment
        }

        $leadId = $this->assignmentService->getTeamSubmissionLead($assignment->team_id);
        return $leadId === $student->id;
    }
}
