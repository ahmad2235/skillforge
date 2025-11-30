<?php

namespace App\Modules\Projects\Application\Services;

use App\Models\User;
use App\Modules\Projects\Infrastructure\Models\Project;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Eloquent\Collection;

class ProjectService
{
    /**
     * رجّع كل المشاريع لصاحب العمل الحالي
     */
    public function listOwnerProjects(User $owner, ?string $status = null): Collection
    {
        $query = Project::query()
            ->where('owner_id', $owner->id); // 🔴 بدل business_id

        if ($status) {
            $query->where('status', $status);
        }

        return $query
            ->orderByDesc('created_at')
            ->get();
    }

    /**
     * إنشاء مشروع جديد لصاحب العمل
     */
    public function createProject(User $owner, array $data): Project
    {
        return DB::transaction(function () use ($owner, $data) {
            return Project::create([
                'owner_id'                 => $owner->id,
                'title'                    => $data['title'],
                'description'              => $data['description'],
                'domain'                   => $data['domain'],
                'required_level'           => $data['required_level'] ?? null,
                'min_score_required'       => $data['min_score_required'] ?? null,
                'status'                   => $data['status'] ?? 'open',
                'min_team_size'            => $data['min_team_size'] ?? null,
                'max_team_size'            => $data['max_team_size'] ?? null,
                'estimated_duration_weeks' => $data['estimated_duration_weeks'] ?? null,
                'metadata'                 => $data['metadata'] ?? [],
            ]);
        });
    }

    /**
     * جلب مشروع واحد والتأكد أنه ملك هذا الـ owner
     */
    public function getOwnerProject(User $owner, int $projectId): Project
    {
        return Project::where('owner_id', $owner->id)   // 🔴 بدل business_id
            ->where('id', $projectId)
            ->firstOrFail();
    }

    /**
     * تحديث مشروع لصاحب العمل
     */
    public function updateProject(User $owner, int $projectId, array $data): Project
    {
        return DB::transaction(function () use ($owner, $projectId, $data) {
            $project = $this->getOwnerProject($owner, $projectId);

            // Only allow fields that exist on the `projects` table
            $allowed = [
                'title',
                'description',
                'domain',
                'required_level',
                'min_score_required',
                'status',
                'min_team_size',
                'max_team_size',
                'estimated_duration_weeks',
                'metadata',
            ];

            $updateData = array_intersect_key($data, array_flip($allowed));

            $project->update($updateData);

            return $project;
        });
    }

    /**
     * تغيير حالة المشروع
     */
    public function changeStatus(User $owner, int $projectId, string $status): Project
    {
        $allowed = ['draft', 'open', 'in_progress', 'completed', 'cancelled'];

        if (!in_array($status, $allowed, true)) {
            abort(422, 'Invalid status value.');
        }

        $project = $this->getOwnerProject($owner, $projectId);

        $project->status = $status;
        $project->save();

        return $project;
    }

    /**
     * حذف مشروع لصاحب العمل
     */
    public function deleteProject(User $owner, int $projectId): void
    {
        $project = $this->getOwnerProject($owner, $projectId);

        $project->delete();
    }
}
