<?php

namespace App\Services\Recommendation\Repositories;

use App\Services\Recommendation\Contracts\ProjectRepository;

// IMPORTANT:
// - Adjust the model namespace/table fields if your app differs.
use App\Models\Project;

class EloquentProjectRepository implements ProjectRepository
{
    public function findNormalized(int $projectId): ?array
    {
        $p = Project::query()->find($projectId);
        if (!$p) return null;

        // Edit these mappings if your column names differ
        return [
            'id' => (int)$p->id,
            'status' => (string)$p->status,
            'domain' => (string)$p->domain,
            'required_level' => (string)$p->required_level,
            'complexity' => (string)($p->complexity ?? 'low'),
        ];
    }

    public function allNormalized(): array
    {
        return Project::query()
            ->get()
            ->map(function ($p) {
                return [
                    'id' => (int)$p->id,
                    'status' => (string)$p->status,
                    'domain' => (string)$p->domain,
                    'required_level' => (string)$p->required_level,
                    'complexity' => (string)($p->complexity ?? 'low'),
                ];
            })
            ->values()
            ->all();
    }
}
