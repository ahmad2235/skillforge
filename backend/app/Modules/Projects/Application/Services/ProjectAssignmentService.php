<?php

namespace App\Modules\Projects\Application\Services;

use App\Models\User;
use App\Modules\Projects\Infrastructure\Models\Project;
use App\Modules\Projects\Infrastructure\Models\ProjectAssignment;
use App\Modules\Projects\Infrastructure\Models\Team;
use App\Modules\AI\Application\Services\RecommendationService;
use App\Notifications\ProjectAssignmentInvitation;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Eloquent\Collection;

class ProjectAssignmentService
{
    public function __construct(
        private readonly RecommendationService $recommendationService,
    ) {}

    /**
     * المرشحين الأساسيين لمشروع معيّن (فلترة بسيطة بدون AI)
     */
    public function getCandidatesForProject(Project $project): Collection
    {
        $query = User::query()
            ->where('role', 'student');

        // تصفية الطلاب الفعّالين فقط لو العمود موجود في الـ DB
        if (Schema::hasColumn('users', 'is_active')) {
            $query->where('is_active', 1);
        }

        if (!empty($project->required_level)) {
            $query->where('level', $project->required_level);
        }

        if (!empty($project->required_domain)) {
            $query->where('domain', $project->required_domain);
        }

        return $query->get();
    }

    /**
     * المرشحين مرتّبين / مجهزين للـ AI recommendation system
     * هذا هو الهـوك اللي هنوصّل فيه الـ AI لاحقاً
     */
    public function getRankedCandidatesForProject(Project $project): array
    {
        $candidates = $this->getCandidatesForProject($project);

        if ($candidates->isEmpty()) {
            return [];
        }

        return $this->recommendationService
            ->rankCandidates($project, $candidates);
    }

    /**
     * كل الـ assignments لمشروع (جهة business)
     */
    public function listProjectAssignments(Project $project): Collection
    {
        return ProjectAssignment::query()
            ->with(['user', 'milestoneSubmissions'])
            ->where('project_id', $project->id)
            ->orderByDesc('created_at')
            ->get();
    }

    /**
     * دعوة طالب لمشروع معيّن مع دعم دعوات متعددة متزامنة
     * 
     * @param Project $project
     * @param User $student
     * @param int|null $teamId
     * @param array $metadata
     * @return ProjectAssignment
     */
    public function inviteStudentToProject(
        Project $project,
        User $student,
        ?int $teamId = null,
        array $metadata = []
    ): ProjectAssignment {
        return DB::transaction(function () use ($project, $student, $teamId, $metadata) {
            // Check if project is already accepted/completed by another team (allow same-team parallel invites)
            $hasActiveAssignment = ProjectAssignment::query()
                ->where('project_id', $project->id)
                ->when($teamId, function ($q) use ($teamId) {
                    $q->where(function ($sub) use ($teamId) {
                        $sub->whereNull('team_id')->orWhere('team_id', '!=', $teamId);
                    });
                })
                ->whereIn('status', ['accepted', 'completed'])
                ->exists();
            
            if ($hasActiveAssignment) {
                abort(422, 'This project is already assigned to a student.');
            }

            // If team is frozen, unfreeze it for the new replacement invite
            if ($teamId) {
                $team = Team::find($teamId);
                if ($team && $team->status === 'frozen') {
                    $team->status = 'pending';
                    $team->save();

                    ProjectAssignment::query()
                        ->where('team_id', $teamId)
                        ->where('status', 'frozen')
                        ->update([
                            'status' => 'pending',
                            'updated_at' => now(),
                        ]);
                }
            }

            // Check if there's already a pending invite for this student
            $existingPending = ProjectAssignment::query()
                ->where('project_id', $project->id)
                ->where('user_id', $student->id)
                ->where('status', 'pending')
                ->first();

            if ($existingPending) {
                // Refresh the token and expiration
                $token = $this->generateInviteToken();
                $existingPending->update([
                    'invite_token_hash' => hash('sha256', $token),
                    'invite_expires_at' => now()->addDays((int) config('skillforge.invite_expiry_days', 7)),
                    'invited_at' => now(),
                    'metadata' => $metadata,
                ]);

                if (config('skillforge.notifications.enabled', true) && config('skillforge.notifications.project_assignment_invitation', true)) {
                    $student->notify(new ProjectAssignmentInvitation($existingPending, $token));
                }

                return $existingPending;
            }

            // Create new invitation
            $token = $this->generateInviteToken();
            
            $assignment = ProjectAssignment::create([
                'project_id' => $project->id,
                'user_id'    => $student->id,
                'team_id'    => $teamId,
                'status'     => 'pending',
                'invite_token_hash' => hash('sha256', $token),
                'invite_expires_at' => now()->addDays((int) config('skillforge.invite_expiry_days', 7)),
                'invited_at' => now(),
                'metadata'   => $metadata,
            ]);

            if (config('skillforge.notifications.enabled', true) && config('skillforge.notifications.project_assignment_invitation', true)) {
                $student->notify(new ProjectAssignmentInvitation($assignment, $token));
            }

            return $assignment;
        });
    }

    /**
     * Invite a team (multiple students) under one team_id with shared context.
     */
    public function inviteTeamToProject(Project $project, array $studentIds, ?string $teamName = null, array $metadata = []): array
    {
        return DB::transaction(function () use ($project, $studentIds, $teamName, $metadata) {
            // If project already taken by another team/solo, abort
            $hasActiveAssignment = ProjectAssignment::query()
                ->where('project_id', $project->id)
                ->whereIn('status', ['accepted', 'completed'])
                ->exists();

            if ($hasActiveAssignment) {
                abort(422, 'This project is already assigned to a student.');
            }

            $students = User::query()
                ->whereIn('id', $studentIds)
                ->where('role', 'student')
                ->get();

            if ($students->count() !== count($studentIds)) {
                abort(422, 'One or more students not found or not valid.');
            }

            // Create team shell
            $team = Team::create([
                'project_id' => $project->id,
                'owner_id' => $project->owner_id,
                'name' => $teamName ?? ('Team ' . $project->title),
                'status' => 'pending',
            ]);

            $assignments = [];
            foreach ($students as $student) {
                $assignments[] = $this->inviteStudentToProject(
                    $project,
                    $student,
                    $team->id,
                    array_merge($metadata, ['team_invite' => true, 'team_name' => $team->name])
                );
            }

            return $assignments;
        });
    }

    /**
     * Invite multiple students to a project at once
     * 
     * @param Project $project
     * @param array $studentIds Array of user IDs
     * @param array $metadata
     * @return array Array of created ProjectAssignment instances
     */
    public function inviteMultipleStudents(
        Project $project,
        array $studentIds,
        array $metadata = []
    ): array {
        // Check if project is already taken
        $hasActiveAssignment = ProjectAssignment::query()
            ->where('project_id', $project->id)
            ->whereIn('status', ['accepted', 'completed'])
            ->exists();
        
        if ($hasActiveAssignment) {
            abort(422, 'This project is already assigned to a student.');
        }

        $students = User::query()
            ->whereIn('id', $studentIds)
            ->where('role', 'student')
            ->get();

        if ($students->count() !== count($studentIds)) {
            abort(422, 'One or more students not found or not valid.');
        }

        $assignments = [];
        
        foreach ($students as $student) {
            $assignments[] = $this->inviteStudentToProject(
                $project,
                $student,
                null,
                $metadata
            );
        }

        return $assignments;
    }

    /**
     * Generate a secure random invite token
     */
    private function generateInviteToken(): string
    {
        return bin2hex(random_bytes(32)); // 64 character hex string
    }

    /**
     * Assignments لطالب معيّن (جهة student)
     */
    public function listStudentAssignments(User $student, ?string $status = null): Collection
    {
        $query = ProjectAssignment::query()
            ->with(['project', 'team', 'team.assignments.user'])
            ->where('user_id', $student->id);

        if ($status) {
            // Map 'active' to 'accepted' for frontend compatibility
            if ($status === 'active') {
                $query->where('status', 'accepted');
            } elseif ($status === 'pending') {
                // Include frozen invites in pending tab (visible but not actionable)
                $query->whereIn('status', ['pending', 'frozen']);
            } else {
                $query->where('status', $status);
            }
        }

        return $query->orderByDesc('created_at')->get();
    }

    /**
     * Owner cancels a pending invitation
     * 
     * @param User $owner
     * @param int $assignmentId
     * @param string|null $reason
     * @return ProjectAssignment
     */
    public function cancelInvitation(User $owner, int $assignmentId, ?string $reason = null): ProjectAssignment
    {
        return DB::transaction(function () use ($owner, $assignmentId, $reason) {
            $assignment = ProjectAssignment::query()
                ->with('project')
                ->where('id', $assignmentId)
                ->lockForUpdate()
                ->firstOrFail();

            // Verify ownership
            if ($assignment->project->owner_id !== $owner->id) {
                abort(403, 'You are not authorized to cancel this invitation.');
            }

            if (!$assignment->canBeCancelled()) {
                abort(422, 'This invitation cannot be cancelled.');
            }

            $assignment->status = 'cancelled';
            $assignment->cancelled_reason = $reason ?? 'cancelled_by_owner';
            $assignment->save();

            // Log the cancellation
            if (class_exists('\App\Modules\AI\Application\Services\AiLogger')) {
                app(\App\Modules\AI\Application\Services\AiLogger::class)->log(
                    'assignment.cancelled',
                    $owner->id,
                    ['assignment_id' => $assignment->id],
                    ['reason' => $assignment->cancelled_reason],
                    ['project_id' => $assignment->project_id]
                );
            }

            return $assignment;
        });
    }

    /**
     * Student accepts invitation with token validation
     * Implements first-accept-wins with automatic cancellation of other invites
     * 
     * @param User $student
     * @param int $assignmentId
     * @param string $token
     * @return ProjectAssignment
     */
    public function acceptInvitation(User $student, int $assignmentId, string $token): ProjectAssignment
    {
        return DB::transaction(function () use ($student, $assignmentId, $token) {
            // Lock the assignment row for update to prevent race conditions
            $assignment = ProjectAssignment::query()
                ->where('id', $assignmentId)
                ->where('user_id', $student->id)
                ->lockForUpdate()
                ->firstOrFail();

            // Validate assignment status
            if ($assignment->status !== 'pending') {
                abort(422, 'This invitation is no longer pending.');
            }

            // Validate token
            if (!$assignment->isTokenValid($token)) {
                abort(422, 'Invalid or expired invitation token.');
            }

            $teamId = $assignment->team_id;

            // Check if project already has an accepted assignment from another team/solo
            $hasActiveAssignment = ProjectAssignment::query()
                ->where('project_id', $assignment->project_id)
                ->whereIn('status', ['accepted', 'completed'])
                ->where('id', '!=', $assignment->id)
                ->when($teamId, function ($q) use ($teamId) {
                    $q->where(function ($sub) use ($teamId) {
                        $sub->whereNull('team_id')->orWhere('team_id', '!=', $teamId);
                    });
                })
                ->when(!$teamId, function ($q) {
                    // Solo acceptance: any accepted assignment blocks
                })
                ->exists();

            if ($hasActiveAssignment) {
                // Mark this pending invitation as cancelled so it no longer appears in the student's dashboard
                $assignment->status = 'cancelled';
                $assignment->cancelled_reason = 'another_candidate_accepted';
                $assignment->save();

                abort(422, 'This project has already been accepted by another candidate/team.');
            }

            // Accept this assignment
            $assignment->status = 'accepted';
            $assignment->assigned_at = now();
            $assignment->save();

            // Update project status
            $assignment->project->update(['status' => 'in_progress']);

            if ($teamId) {
                // Cancel pending invitations from other teams/solo only
                ProjectAssignment::query()
                    ->where('project_id', $assignment->project_id)
                    ->where('status', 'pending')
                    ->where('id', '!=', $assignment->id)
                    ->where(function ($q) use ($teamId) {
                        $q->whereNull('team_id')->orWhere('team_id', '!=', $teamId);
                    })
                    ->update([
                        'status' => 'cancelled',
                        'cancelled_reason' => 'another_candidate_accepted',
                        'updated_at' => now(),
                    ]);

                // Unfreeze remaining team invites (if any) now that one accepted
                ProjectAssignment::query()
                    ->where('team_id', $teamId)
                    ->where('status', 'frozen')
                    ->update([
                        'status' => 'pending',
                        'updated_at' => now(),
                    ]);

                // Update team status to active if all team invites accepted
                $teamAssignments = ProjectAssignment::query()
                    ->where('team_id', $teamId)
                    ->get();

                $allAccepted = $teamAssignments->every(fn ($a) => $a->status === 'accepted');
                $teamModel = $assignment->team;
                if ($teamModel) {
                    $teamModel->status = $allAccepted ? 'active' : 'partial';
                    $teamModel->save();
                }
            } else {
                // Solo flow: cancel all others
                ProjectAssignment::query()
                    ->where('project_id', $assignment->project_id)
                    ->where('status', 'pending')
                    ->where('id', '!=', $assignment->id)
                    ->update([
                        'status' => 'cancelled',
                        'cancelled_reason' => 'another_candidate_accepted',
                        'updated_at' => now(),
                    ]);
            }

            // Log the acceptance
            if (class_exists('\App\Modules\AI\Application\Services\AiLogger')) {
                app(\App\Modules\AI\Application\Services\AiLogger::class)->log(
                    'assignment.accepted',
                    $student->id,
                    ['assignment_id' => $assignment->id],
                    ['project_id' => $assignment->project_id],
                    ['cancelled_other_invites' => true]
                );
            }

            $assignment = $assignment->fresh(['project', 'user', 'team']);
            // Add team_status to response for frontend messaging
            if ($assignment->team) {
                $assignment->team_status = $assignment->team->status;
            }
            return $assignment;
        });
    }

    /**
     * Allow a logged-in student to accept a pending assignment without providing the raw token.
     * This is intended for in-app UX where the student is authenticated and owns the assignment.
     * It keeps the same concurrency and race-condition protections as the token-based flow.
     */
    public function acceptPendingAssignmentForStudent(User $student, int $assignmentId): ProjectAssignment
    {
        return DB::transaction(function () use ($student, $assignmentId) {
            $assignment = ProjectAssignment::query()
                ->where('id', $assignmentId)
                ->where('user_id', $student->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($assignment->status !== 'pending') {
                abort(422, 'This invitation is no longer pending.');
            }

            $hasActiveAssignment = ProjectAssignment::query()
                ->where('project_id', $assignment->project_id)
                ->whereIn('status', ['accepted', 'completed'])
                ->where('id', '!=', $assignment->id)
                ->exists();

            if ($hasActiveAssignment) {
                // Mark this pending invitation as cancelled so it no longer appears in the student's dashboard
                $assignment->status = 'cancelled';
                $assignment->cancelled_reason = 'another_candidate_accepted';
                $assignment->save();

                abort(422, 'This project has already been accepted by another student.');
            }

            // Accept this assignment
            $assignment->status = 'accepted';
            $assignment->assigned_at = now();
            $assignment->save();

            // Update project status
            $assignment->project->update(['status' => 'in_progress']);

            $teamId = $assignment->team_id;
            if ($teamId) {
                ProjectAssignment::query()
                    ->where('project_id', $assignment->project_id)
                    ->where('status', 'pending')
                    ->where('id', '!=', $assignment->id)
                    ->where(function ($q) use ($teamId) {
                        $q->whereNull('team_id')->orWhere('team_id', '!=', $teamId);
                    })
                    ->update([
                        'status' => 'cancelled',
                        'cancelled_reason' => 'another_candidate_accepted',
                        'updated_at' => now(),
                    ]);

                ProjectAssignment::query()
                    ->where('team_id', $teamId)
                    ->where('status', 'frozen')
                    ->update([
                        'status' => 'pending',
                        'updated_at' => now(),
                    ]);

                $teamAssignments = ProjectAssignment::query()
                    ->where('team_id', $teamId)
                    ->get();

                $allAccepted = $teamAssignments->every(fn ($a) => $a->status === 'accepted');
                $teamModel = $assignment->team;
                if ($teamModel) {
                    $teamModel->status = $allAccepted ? 'active' : 'partial';
                    $teamModel->save();
                }
            } else {
                ProjectAssignment::query()
                    ->where('project_id', $assignment->project_id)
                    ->where('status', 'pending')
                    ->where('id', '!=', $assignment->id)
                    ->update([
                        'status' => 'cancelled',
                        'cancelled_reason' => 'another_candidate_accepted',
                        'updated_at' => now(),
                    ]);
            }

            // Log the acceptance
            if (class_exists('\App\Modules\AI\Application\Services\AiLogger')) {
                app(\App\Modules\AI\Application\Services\AiLogger::class)->log(
                    'assignment.accepted',
                    $student->id,
                    ['assignment_id' => $assignment->id],
                    ['project_id' => $assignment->project_id],
                    ['cancelled_other_invites' => true]
                );
            }

            $assignment = $assignment->fresh(['project', 'user', 'team']);
            // Add team_status to response for frontend messaging
            if ($assignment->team) {
                $assignment->team_status = $assignment->team->status;
            }
            return $assignment;
        });
    }

    /**
     * Student declines invitation
     * 
     * @param User $student
     * @param int $assignmentId
     * @return ProjectAssignment
     */
    public function declineInvitation(User $student, int $assignmentId): ProjectAssignment
    {
        return DB::transaction(function () use ($student, $assignmentId) {
            $assignment = ProjectAssignment::query()
                ->where('id', $assignmentId)
                ->where('user_id', $student->id)
                ->lockForUpdate()
                ->firstOrFail();

            if (!in_array($assignment->status, ['pending', 'frozen'], true)) {
                abort(422, 'This invitation is no longer pending.');
            }

            $assignment->status = 'declined';
            $assignment->save();

            // If team invite: freeze remaining team invites until owner replaces
            if ($assignment->team_id) {
                $teamId = $assignment->team_id;

                ProjectAssignment::query()
                    ->where('team_id', $teamId)
                    ->where('status', 'pending')
                    ->update([
                        'status' => 'frozen',
                        'cancelled_reason' => 'team_member_declined',
                        'updated_at' => now(),
                    ]);

                $team = $assignment->team;
                if ($team) {
                    $team->status = 'frozen';
                    $team->save();
                }
            }

            // Log the decline
            if (class_exists('\App\Modules\AI\Application\Services\AiLogger')) {
                app(\App\Modules\AI\Application\Services\AiLogger::class)->log(
                    'assignment.declined',
                    $student->id,
                    ['assignment_id' => $assignment->id],
                    ['project_id' => $assignment->project_id],
                    []
                );
            }

            return $assignment;
        });
    }

    /**
     * Legacy method for backward compatibility - redirects to new token-based method
     * @deprecated Use acceptInvitation() or declineInvitation() instead
     */
    public function studentRespond(User $student, int $assignmentId, string $action): ProjectAssignment
    {
        if ($action === 'decline') {
            return $this->declineInvitation($student, $assignmentId);
        }

        abort(422, 'Accept action requires a valid token. Use acceptInvitation() method instead.');
    }

    /**
     * Delete an assignment (business can remove if no students accepted yet)
     */
    public function deleteAssignment(User $owner, int $assignmentId): void
    {
        DB::transaction(function () use ($owner, $assignmentId) {
            $assignment = ProjectAssignment::query()
                ->with('project', 'team')
                ->where('id', $assignmentId)
                ->lockForUpdate()
                ->firstOrFail();

            // Verify ownership
            if ($assignment->project->owner_id !== $owner->id) {
                abort(403, 'You are not authorized to delete this assignment.');
            }

            // For team assignments: check if any team member has accepted
            if ($assignment->team_id) {
                $hasAccepted = ProjectAssignment::query()
                    ->where('team_id', $assignment->team_id)
                    ->whereIn('status', ['accepted', 'completed'])
                    ->exists();

                if ($hasAccepted) {
                    abort(422, 'Cannot delete assignment: one or more team members have already accepted.');
                }

                // Delete all team assignments and the team itself
                ProjectAssignment::where('team_id', $assignment->team_id)->delete();
                if ($assignment->team) {
                    $assignment->team->delete();
                }
            } else {
                // Solo assignment: only delete if pending/frozen/declined/cancelled
                if (in_array($assignment->status, ['accepted', 'completed'], true)) {
                    abort(422, 'Cannot delete assignment: student has already accepted.');
                }
                $assignment->delete();
            }
        });
    }

    /**
     * إنهاء assignment من جهة صاحب المشروع + تقييمه للطالب
     */
    public function ownerCompleteWithFeedback(
        User $owner,
        int $assignmentId,
        ?string $feedback,
        ?int $rating
    ): ProjectAssignment {
        return DB::transaction(function () use ($owner, $assignmentId, $feedback, $rating) {
            $assignment = ProjectAssignment::query()
                ->with('project')
                ->where('id', $assignmentId)
                ->firstOrFail();

            if (!$assignment->project || $assignment->project->owner_id !== $owner->id) {
                abort(403, 'You are not allowed to manage this assignment.');
            }

            if (!in_array($assignment->status, ['accepted', 'completed'], true)) {
                abort(422, 'Assignment must be accepted before completion.');
            }

            if (!is_null($rating)) {
                if ($rating < 1 || $rating > 5) {
                    abort(422, 'Rating must be between 1 and 5.');
                }
                $assignment->rating_from_owner = $rating;
            }

            $assignment->owner_feedback = $feedback;
            $assignment->status         = 'completed';
            $assignment->completed_at   = now();
            $assignment->save();

            // Update project status
            $assignment->project->update(['status' => 'completed']);

            return $assignment;
        });
    }

    /**
     * تقييم الطالب لصاحب المشروع / المشروع بعد انتهاءه
     */
    public function studentFeedback(
        User $student,
        int $assignmentId,
        ?string $feedback,
        ?int $rating
    ): ProjectAssignment {
        return DB::transaction(function () use ($student, $assignmentId, $feedback, $rating) {
            $assignment = ProjectAssignment::query()
                ->where('id', $assignmentId)
                ->where('user_id', $student->id)      // 🔴 بدل student_id
                ->firstOrFail();

            if ($assignment->status !== 'completed') {
                abort(422, 'Assignment must be completed before student feedback.');
            }

            if (!is_null($rating)) {
                if ($rating < 1 || $rating > 5) {
                    abort(422, 'Rating must be between 1 and 5.');
                }
                $assignment->rating_from_student = $rating;
            }

            $assignment->student_feedback = $feedback;
            $assignment->save();

            return $assignment;
        });
    }

    /**
     * Determine which team member is authorized to submit the final assignment
     * Returns user_id of authorized submitter (higher score, or backend on tie)
     */
    public function getTeamSubmissionLead(int $teamId): ?int
    {
        $teamAssignments = ProjectAssignment::query()
            ->with('user')
            ->where('team_id', $teamId)
            ->whereIn('status', ['accepted', 'completed'])
            ->get();

        if ($teamAssignments->count() < 2) {
            // If only one member, they can submit
            return $teamAssignments->first()?->user_id;
        }

        // Compare recommendation scores from metadata
        $scored = $teamAssignments->map(function ($assignment) {
            return [
                'user_id' => $assignment->user_id,
                'domain' => $assignment->user->domain,
                'score' => $assignment->metadata['score'] ?? 0,
            ];
        })->sortByDesc('score');

        $top = $scored->values();
        if ($top->count() === 0) {
            return null;
        }

        // If tied, backend wins
        if ($top->count() > 1 && $top[0]['score'] === $top[1]['score']) {
            $backend = $top->firstWhere('domain', 'backend');
            return $backend ? $backend['user_id'] : $top[0]['user_id'];
        }

        return $top[0]['user_id'];
    }
}
