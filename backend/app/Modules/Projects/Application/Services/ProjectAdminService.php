<?php

namespace App\Modules\Projects\Application\Services;

use App\Modules\Projects\Infrastructure\Models\Project;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class ProjectAdminService
{
    public function listProjects(array $filters = [], int $perPage = 10): LengthAwarePaginator
    {
        $query = Project::query()->orderByDesc('created_at');

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['domain'])) {
            $query->where('domain', $filters['domain']);
        }

        if (!empty($filters['required_level'])) {
            $query->where('required_level', $filters['required_level']);
        }

        return $query->paginate($perPage);
    }

    public function updateProject(Project $project, array $data): Project
    {
        $project->fill([
            'status'         => $data['status'] ?? $project->status,
            'required_level' => $data['required_level'] ?? $project->required_level,
            'domain'         => $data['domain'] ?? $project->domain,
            'admin_note'     => $data['admin_note'] ?? $project->admin_note,
        ]);

        $project->save();

        return $project;
    }

    public function deleteProject(Project $project): void
    {
        $project->status = 'cancelled';
        $project->save();
    }
}
