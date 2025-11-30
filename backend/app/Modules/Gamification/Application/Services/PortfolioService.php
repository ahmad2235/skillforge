<?php

namespace App\Modules\Gamification\Application\Services;

use App\Models\User;
use App\Modules\Gamification\Infrastructure\Models\Portfolio;
use App\Modules\Projects\Infrastructure\Models\ProjectAssignment;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class PortfolioService
{
    /**
     * كل الـ portfolios تبع الطالب
     */
    public function listForStudent(User $student): Collection
    {
        return Portfolio::query()
            ->where('user_id', $student->id)
            ->orderByDesc('created_at')
            ->get();
    }

    /**
     * إنشاء Portfolio جديد من assignment مكتمل (لمشاريع الـ business)
     */
    public function createFromAssignment(
        User $student,
        int $assignmentId,
        array $data
    ): Portfolio {
        return DB::transaction(function () use ($student, $assignmentId, $data) {

            /** @var ProjectAssignment $assignment */
            $assignment = ProjectAssignment::query()
                ->with('project')
                ->where('id', $assignmentId)
                ->where('user_id', $student->id)
                ->firstOrFail();

            if ($assignment->status !== 'completed') {
                abort(422, 'Assignment must be completed before creating a portfolio item.');
            }

            if (!$assignment->project) {
                abort(422, 'Assignment has no related project.');
            }

            // منع تكرار نفس المشروع في البورتفوليو لنفس الطالب (اختياري لكن منطقي)
            $existing = Portfolio::query()
                ->where('user_id', $student->id)
                ->where('project_id', $assignment->project_id)
                ->first();

            if ($existing) {
                return $existing;
            }

            $project = $assignment->project;

            return Portfolio::create([
                'user_id'        => $student->id,
                'level_project_id' => null,                // هذا لحالة level_projects (learning), مش هنستخدمه هنا
                'project_id'     => $project->id,

                'title'          => $data['title']        ?? $project->title,
                'description'    => $data['description']  ?? $project->description,
                'github_url'     => $data['github_url']   ?? null,
                'live_demo_url'  => $data['live_demo_url']?? null,

                // نستخدم rating/feedback تبع صاحب العمل كقيمة افتراضية
                'score'          => $data['score']
                                    ?? ($assignment->rating_from_owner ?? null),
                'feedback'       => $data['feedback']
                                    ?? ($assignment->owner_feedback ?? null),

                'is_public'      => $data['is_public']    ?? true,
                'metadata'       => $data['metadata']     ?? [],
            ]);
        });
    }
}
