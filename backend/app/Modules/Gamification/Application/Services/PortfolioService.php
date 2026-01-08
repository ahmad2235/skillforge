<?php

namespace App\Modules\Gamification\Application\Services;

use App\Models\User;
use App\Modules\Gamification\Infrastructure\Models\Portfolio;
use App\Modules\Projects\Infrastructure\Models\ProjectAssignment;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PortfolioService
{
    /**
     * كل الـ portfolios تبع الطالب
     */
    public function listForStudent(User $student): Collection
    {
        return Portfolio::query()
            ->where('user_id', $student->id)
            ->with(['user', 'project', 'levelProject'])
            ->orderByDesc('created_at')
            ->get();
    }

    /**
     * الحصول على portfolio item محدد
     */
    public function getById(int $portfolioId): Portfolio
    {
        return Portfolio::query()
            ->with(['user', 'project', 'levelProject'])
            ->findOrFail($portfolioId);
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
                'metadata'       => $this->buildMetadata($data, $assignment, $project),
            ]);
        });
    }

    /**
     * إنشاء Portfolio item ad-hoc (بدون assignment محدد)
     */
    public function createAdHoc(User $student, array $data): Portfolio
    {
        return DB::transaction(function () use ($student, $data) {
            return Portfolio::create([
                'user_id'        => $student->id,
                'level_project_id' => $data['level_project_id'] ?? null,
                'project_id'     => $data['project_id'] ?? null,

                'title'          => $data['title'],
                'description'    => $data['description'] ?? null,
                'github_url'     => $data['github_url'] ?? null,
                'live_demo_url'  => $data['live_demo_url'] ?? null,

                'score'          => $data['score'] ?? null,
                'feedback'       => $data['feedback'] ?? null,

                'is_public'      => $data['is_public'] ?? true,
                'metadata'       => [
                    'category' => $data['category'] ?? null,
                    'tags'     => $data['tags'] ?? [],
                    'created_by' => 'manual',
                    'created_at' => now()->toDateTimeString(),
                ],
            ]);
        });
    }

    /**
     * تحديث portfolio item
     */
    public function update(int $portfolioId, User $student, array $data): Portfolio
    {
        return DB::transaction(function () use ($portfolioId, $student, $data) {
            $portfolio = $this->getById($portfolioId);

            if ($portfolio->user_id !== $student->id && $student->role !== 'admin') {
                abort(403, 'Unauthorized to update this portfolio item.');
            }

            $updateData = [];

            if (isset($data['title'])) {
                $updateData['title'] = $data['title'];
            }

            if (isset($data['description'])) {
                $updateData['description'] = $data['description'];
            }

            if (isset($data['github_url'])) {
                $updateData['github_url'] = $data['github_url'];
            }

            if (isset($data['live_demo_url'])) {
                $updateData['live_demo_url'] = $data['live_demo_url'];
            }

            if (isset($data['is_public'])) {
                $updateData['is_public'] = $data['is_public'];
            }

            if (isset($data['feedback'])) {
                $updateData['feedback'] = $data['feedback'];
            }

            if (isset($data['score'])) {
                $updateData['score'] = $data['score'];
            }

            // Update metadata fields
            $metadata = $portfolio->metadata ?? [];
            if (isset($data['category'])) {
                $metadata['category'] = $data['category'];
            }
            if (isset($data['tags'])) {
                $metadata['tags'] = $data['tags'];
            }
            if (!empty($metadata)) {
                $updateData['metadata'] = $metadata;
            }

            $portfolio->update($updateData);

            return $portfolio->fresh(['user', 'project', 'levelProject']);
        });
    }

    /**
     * حذف portfolio item
     */
    public function delete(int $portfolioId, User $student): bool
    {
        $portfolio = $this->getById($portfolioId);

        if ($portfolio->user_id !== $student->id && $student->role !== 'admin') {
            abort(403, 'Unauthorized to delete this portfolio item.');
        }

        return (bool) $portfolio->delete();
    }

    /**
     * تبديل visibility (is_public)
     */
    public function toggleVisibility(int $portfolioId, User $student): Portfolio
    {
        $portfolio = $this->getById($portfolioId);

        if ($portfolio->user_id !== $student->id && $student->role !== 'admin') {
            abort(403, 'Unauthorized to toggle visibility for this portfolio item.');
        }

        $portfolio->update(['is_public' => !$portfolio->is_public]);

        return $portfolio->fresh(['user', 'project', 'levelProject']);
    }

    /**
     * الحصول على معلومات مستوى الطالب وحالته في المنصة
     */
    public function getStudentLevelInfo(User $student): array
    {
        // الحصول على عدد المهام المكتملة
        $completedTasksCount = 0;
        $currentLevel = $student->level ?? 'beginner';

        // يمكن توسيع هذا لاحقاً للحصول على عدد المهام الفعلي من جداول التتبع
        return [
            'level' => $currentLevel,
            'label' => ucfirst($currentLevel),
            'completedTasks' => $completedTasksCount,
            'portfolioItems' => Portfolio::where('user_id', $student->id)->count(),
        ];
    }

    /**
     * بناء metadata من بيانات الـ assignment والمشروع
     */
    private function buildMetadata(array $data, ProjectAssignment $assignment, $project): array
    {
        $metadata = $data['metadata'] ?? [];

        // إضافة معلومات المشروع والـ assignment
        $metadata['project_name'] = $project->title ?? $project->name ?? null;
        $metadata['project_id'] = $project->id;
        $metadata['assignment_id'] = $assignment->id;
        $metadata['category'] = $data['category'] ?? null;
        $metadata['tags'] = $data['tags'] ?? [];
        $metadata['source'] = 'assignment';
        $metadata['created_at'] = now()->toDateTimeString();

        return $metadata;
    }
}
