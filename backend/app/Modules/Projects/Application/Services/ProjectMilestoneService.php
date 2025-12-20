<?php

namespace App\Modules\Projects\Application\Services;

use App\Models\User;
use App\Modules\Projects\Infrastructure\Models\Project;
use App\Modules\Projects\Infrastructure\Models\ProjectMilestone;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class ProjectMilestoneService
{
    public function listProjectMilestones(Project $project): Collection
    {
        return $project->milestones()
            ->orderBy('order_index')
            ->get();
    }

    public function createMilestone(User $owner, Project $project, array $data): ProjectMilestone
    {
        $this->ensureOwner($owner, $project);

        return DB::transaction(function () use ($project, $data) {
            $nextOrder = $project->milestones()->max('order_index');
            $orderIndex = $data['order_index'] ?? (($nextOrder ?? 0) + 1);

            return ProjectMilestone::create([
                'project_id'  => $project->id,
                'title'       => $data['title'],
                'description' => $data['description'] ?? null,
                'order_index' => $orderIndex,
                'due_date'    => $data['due_date'] ?? null,
                'is_required' => $data['is_required'] ?? true,
            ]);
        });
    }

    public function updateMilestone(User $owner, ProjectMilestone $milestone, array $data): ProjectMilestone
    {
        $project = $milestone->project;
        $this->ensureOwner($owner, $project);

        return DB::transaction(function () use ($milestone, $data) {
            $updateData = array_filter([
                'title'       => $data['title'] ?? null,
                'description' => $data['description'] ?? null,
                'order_index' => $data['order_index'] ?? null,
                'due_date'    => $data['due_date'] ?? null,
                'is_required' => $data['is_required'] ?? null,
            ], static fn ($value) => $value !== null);

            $milestone->update($updateData);

            return $milestone;
        });
    }

    public function deleteMilestone(User $owner, ProjectMilestone $milestone): void
    {
        $project = $milestone->project;
        $this->ensureOwner($owner, $project);

        $milestone->delete();
    }

    private function ensureOwner(User $owner, Project $project): void
    {
        if ($owner->role === 'admin') {
            return;
        }

        if ($project->owner_id !== $owner->id) {
            abort(403, 'You are not allowed to manage milestones for this project.');
        }
    }
}
