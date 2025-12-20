<?php

namespace App\Modules\Projects\Application\Services;

use App\Models\User;
use App\Modules\Projects\Infrastructure\Models\Project;
use App\Modules\Projects\Infrastructure\Models\ProjectAssignment;
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
            ->where('project_id', $project->id)
            ->orderByDesc('created_at')
            ->get();
    }

    /**
     * دعوة طالب لمشروع معيّن
     */
    public function inviteStudentToProject(
        Project $project,
        User $student,
        ?int $teamId = null,
        array $metadata = []
    ): ProjectAssignment {
        return DB::transaction(function () use ($project, $student, $teamId, $metadata) {
            // منع تكرار الدعوة ما دام مو removed
            $existing = ProjectAssignment::query()
                ->where('project_id', $project->id)
                ->where('user_id', $student->id)   // 🔴 بدل student_id
                ->where('status', '!=', 'removed')
                ->first();

            if ($existing) {
                return $existing;
            }

            $assignment = ProjectAssignment::create([
                'project_id' => $project->id,
                'user_id'    => $student->id,      // 🔴 بدل student_id
                'team_id'    => $teamId,
                'status'     => 'invited',
                'metadata'   => $metadata,
                // match_score, assigned_at, ... تقدر تعبّيهم لاحقاً من AI أو logic آخر
            ]);

            if (config('skillforge.notifications.enabled') && config('skillforge.notifications.project_assignment_invitation')) {
                $student->notify(new ProjectAssignmentInvitation($assignment));
            }

            return $assignment;
        });
    }

    /**
     * Assignments لطالب معيّن (جهة student)
     */
    public function listStudentAssignments(User $student, ?string $status = null): Collection
    {
        $query = ProjectAssignment::query()
            ->where('user_id', $student->id);     // 🔴 بدل student_id

        if ($status) {
            $query->where('status', $status);
        }

        return $query->orderByDesc('created_at')->get();
    }

    /**
     * استجابة الطالب للدعوة (accept / decline)
     */
    public function studentRespond(User $student, int $assignmentId, string $action): ProjectAssignment
    {
        $assignment = ProjectAssignment::query()
            ->where('id', $assignmentId)
            ->where('user_id', $student->id)      // 🔴 بدل student_id
            ->firstOrFail();

        if (!in_array($assignment->status, ['invited', 'accepted', 'declined'], true)) {
            abort(422, 'Cannot change status for this assignment.');
        }

        if ($action === 'accept') {
            $assignment->status      = 'accepted';
            $assignment->assigned_at = now();     // تقدّر تحفظ وقت التعيين هنا
        } elseif ($action === 'decline') {
            $assignment->status = 'declined';
        } else {
            abort(422, 'Invalid action.');
        }

        $assignment->save();

        return $assignment;
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
}
