<?php

namespace App\Modules\Projects\Application\Services;

use App\Models\User;
use App\Modules\Projects\Infrastructure\Models\ProjectAssignment;
use App\Modules\Projects\Infrastructure\Models\ProjectMilestone;
use App\Modules\Projects\Infrastructure\Models\ProjectMilestoneSubmission;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use App\Modules\AI\Application\Services\AiLogger;

class ProjectMilestoneSubmissionService
{
    public function __construct(
        private readonly AiLogger $aiLogger,
    ) {}

    public function listMilestonesForAssignment(ProjectAssignment $assignment): Collection
    {
        return $assignment->project
            ->milestones()
            ->with(['submissions' => function ($query) use ($assignment) {
                $query->where('project_assignment_id', $assignment->id);
            }])
            ->orderBy('order_index')
            ->get();
    }

    public function submitMilestone(
        User $student,
        ProjectAssignment $assignment,
        ProjectMilestone $milestone,
        array $data
    ): ProjectMilestoneSubmission {
        if ($assignment->user_id !== $student->id) {
            abort(403, 'You are not assigned to this project.');
        }

        if ($assignment->project_id !== $milestone->project_id) {
            abort(422, 'Milestone does not belong to this project assignment.');
        }

        if (!in_array($assignment->status, ['accepted', 'completed'], true)) {
            abort(422, 'Assignment must be accepted before submitting milestones.');
        }

        return DB::transaction(function () use ($student, $assignment, $milestone, $data) {
            $payload = [
                'user_id'       => $student->id,
                'answer_text'   => $data['answer_text'] ?? null,
                'attachment_url'=> $data['attachment_url'] ?? null,
                'status'        => 'submitted',
                'review_feedback' => null,
                'reviewed_by'   => null,
                'reviewed_at'   => null,
            ];

            $submission = ProjectMilestoneSubmission::updateOrCreate(
                [
                    'project_assignment_id' => $assignment->id,
                    'project_milestone_id'  => $milestone->id,
                ],
                $payload
            );

            return $submission->fresh(['milestone']);
        });
    }

    public function listSubmissionsForAdmin(?string $status = null, ?int $projectId = null): Collection
    {
        $query = ProjectMilestoneSubmission::query()
            ->with(['milestone', 'assignment.project', 'user']);

        if ($status) {
            $query->where('status', $status);
        }

        if ($projectId) {
            $query->whereHas('milestone', function ($subQuery) use ($projectId) {
                $subQuery->where('project_id', $projectId);
            });
        }

        return $query
            ->orderByDesc('created_at')
            ->get();
    }

    public function reviewSubmission(User $reviewer, ProjectMilestoneSubmission $submission, string $status, ?string $feedback = null): ProjectMilestoneSubmission
    {
        if ($reviewer->role !== 'admin') {
            abort(403, 'Only admins can review milestone submissions.');
        }

        if (!in_array($status, ['approved', 'rejected', 'reviewed'], true)) {
            abort(422, 'Invalid review status.');
        }

        $submission->status = $status;
        $submission->review_feedback = $feedback;
        $submission->reviewed_by = $reviewer->id;
        $submission->reviewed_at = now();
        $submission->save();

        $this->aiLogger->log(
            'milestone.review',
            $reviewer->id,
            [
                'submission_id' => $submission->id,
                'previous_status' => $submission->getOriginal('status'),
            ],
            [
                'new_status' => $status,
                'feedback'   => $feedback,
            ],
            [
                'project_id' => $submission->assignment->project_id ?? null,
            ]
        );

        return $submission;
    }
}
