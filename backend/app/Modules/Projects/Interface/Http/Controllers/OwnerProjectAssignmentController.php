<?php

namespace App\Modules\Projects\Interface\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\AI\Application\Services\RecommendationService;
use App\Modules\Projects\Application\Services\ProjectAssignmentService;
use App\Modules\Projects\Infrastructure\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

use App\Modules\Projects\Infrastructure\Models\ProjectAssignment;
use App\Modules\Projects\Infrastructure\Models\ProjectMilestoneSubmission;

class OwnerProjectAssignmentController extends Controller
{
    public function __construct(
        private readonly RecommendationService $recommendationService,
        private readonly ProjectAssignmentService $assignmentService
    ) {}

    /**
     * Get submissions for a specific assignment
     * GET /api/business/projects/assignments/{assignment}/submissions
     */
    public function submissions(int $assignmentId)
    {
        $owner = Auth::user();
        $assignment = ProjectAssignment::with(['project.milestones', 'milestoneSubmissions'])
            ->findOrFail($assignmentId);

        $this->authorize('view', $assignment->project);

        // Organize data: milestones with their submission (if any)
        $milestones = $assignment->project->milestones->map(function ($milestone) use ($assignment) {
            $submission = $assignment->milestoneSubmissions
                ->where('project_milestone_id', $milestone->id)
                ->first();
            
            return [
                'milestone' => $milestone,
                'submission' => $submission
            ];
        });

        return response()->json([
            'data' => $milestones
        ]);
    }

    /**
     * Review a milestone submission
     * POST /api/business/projects/submissions/{submission}/review
     */
    public function reviewSubmission(Request $request, int $submissionId)
    {
        $owner = Auth::user();
        
        $data = $request->validate([
            'status' => 'required|in:approved,rejected',
            'feedback' => 'nullable|string'
        ]);

        $submission = ProjectMilestoneSubmission::with('assignment.project')->findOrFail($submissionId);
        
        if ($submission->assignment->project->owner_id !== $owner->id) {
            abort(403, 'Unauthorized');
        }

        $submission->update([
            'status' => $data['status'],
            'review_feedback' => $data['feedback'] ?? null,
            'reviewed_by' => $owner->id,
            'reviewed_at' => now()
        ]);

        return response()->json([
            'message' => 'Submission reviewed successfully',
            'data' => $submission
        ]);
    }

    /**
     * المرشحين (candidates) لمشروع معيّن — يمرّ عبر AI hook
     * GET /api/business/projects/{project}/candidates
     */
    public function candidates(Project $project)
    {
        $owner = Auth::user();
        abort_unless($project->owner_id === $owner->id, 403);

        // Load raw active student candidates
        $candidates = User::where('role', 'student')
            ->where('is_active', 1)
            ->get();

        // Pass through the recommendation service to score & rank
        $ranked = $this->recommendationService->rankCandidates($project, $candidates);
        $teams = $this->recommendationService->buildTeams($project, $ranked);

        return response()->json([
            'data' => array_map(function ($item) {
                /** @var \App\Models\User $student */
                $student = $item['student'];

                return [
                    'student' => [
                        'id'     => $student->id,
                        'name'   => $student->name,
                        'email'  => $student->email,
                        'level'  => $student->level,
                        'domain' => $student->domain,
                    ],
                    'score'  => $item['score'],
                    'reason' => $item['reason'],
                ];
            }, $ranked),
            'teams' => $teams,
        ]);
    }

    /**
     * كل الـ assignments لمشروع معيّن
     * GET /api/business/projects/{project}/assignments
     */
    public function index(Project $project)
    {
        $owner = Auth::user();
        $this->authorize('view', $project);

        $assignments = $this->assignmentService->listProjectAssignments($project);

        return response()->json([
            'project'     => $project,
            'assignments' => $assignments,
        ]);
    }

    /**
     * دعوة طالب أو عدة طلاب لمشروع
     * POST /api/business/projects/{project}/assignments
     */
    public function invite(Request $request, Project $project)
    {
        $owner = Auth::user();
        $this->authorize('update', $project);

        $data = $request->validate([
            // Accept one of: user_id, user_ids, team_members
            'user_id'      => 'required_without_all:user_ids,team_members|integer|exists:users,id',
            'user_ids'     => 'required_without_all:user_id,team_members|array|min:1',
            'user_ids.*'   => 'integer|exists:users,id',
            'team_members' => 'required_without_all:user_id,user_ids|array|min:2',
            'team_members.*' => 'integer|exists:users,id',

            'team_id'   => 'nullable|integer',
            'team_name' => 'sometimes|string|max:120',
            'metadata'  => 'nullable|array',
        ]);

        // Team invite support (creates team + grouped invites)
        if (isset($data['team_members'])) {
            $assignments = $this->assignmentService->inviteTeamToProject(
                $project,
                $data['team_members'],
                $data['team_name'] ?? null,
                $data['metadata'] ?? []
            );

            return response()->json([
                'message'     => 'Team invited to project.',
                'assignments' => $assignments,
                'team_id'     => optional($assignments[0] ?? null)->team_id,
            ], 201);
        }

        // Multi-invite support
        if (isset($data['user_ids'])) {
            $assignments = $this->assignmentService->inviteMultipleStudents(
                $project,
                $data['user_ids'],
                $data['metadata'] ?? []
            );

            return response()->json([
                'message'     => count($assignments) . ' students invited to project.',
                'assignments' => $assignments,
            ], 201);
        }

        // Single invite
        $student = User::query()
            ->where('id', $data['user_id'])
            ->where('role', 'student')
            ->firstOrFail();

        $assignment = $this->assignmentService->inviteStudentToProject(
            $project,
            $student,
            $data['team_id'] ?? null,
            $data['metadata'] ?? []
        );

        return response()->json([
            'message'    => 'Student invited to project.',
            'assignment' => $assignment,
        ], 201);
    }

    /**
     * إلغاء دعوة قيد الانتظار
     * DELETE /api/business/projects/assignments/{assignment}/cancel
     */
    public function cancelInvitation(int $assignmentId, Request $request)
    {
        $owner = Auth::user();

        $data = $request->validate([
            'reason' => 'nullable|string|max:255',
        ]);

        $assignment = $this->assignmentService->cancelInvitation(
            $owner,
            $assignmentId,
            $data['reason'] ?? null
        );

        return response()->json([
            'message'    => 'Invitation cancelled successfully.',
            'assignment' => $assignment,
        ]);
    }

    /**
     * Delete an assignment (only if no students accepted)
     * DELETE /api/business/projects/assignments/{assignment}
     */
    public function destroy(int $assignmentId)
    {
        $owner = Auth::user();
        
        $this->assignmentService->deleteAssignment($owner, $assignmentId);

        return response()->json([
            'message' => 'Assignment deleted successfully.',
        ]);
    }

    /**
     * صاحب المشروع يعلّم الـ assignment completed + يضيف feedback + rating
     * POST /api/business/projects/assignments/{assignment}/complete
     */
    public function completeWithFeedback(Request $request, int $assignmentId)
    {
        $owner = Auth::user();

        $data = $request->validate([
            'feedback' => 'nullable|string',
            'rating'   => 'nullable|integer|min:1|max:5',
        ]);

        $assignment = $this->assignmentService->ownerCompleteWithFeedback(
            $owner,
            $assignmentId,
            $data['feedback'] ?? null,
            $data['rating'] ?? null
        );

        return response()->json([
            'message'    => 'Assignment marked as completed and feedback saved.',
            'assignment' => $assignment,
        ]);
    }
}
