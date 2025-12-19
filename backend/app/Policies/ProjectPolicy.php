<?php

namespace App\Policies;

use App\Models\User;
use App\Modules\Projects\Infrastructure\Models\Project;

class ProjectPolicy
{
    public function view(User $user, Project $project): bool
    {
        return $user->role === 'admin' || $project->owner_id === $user->id;
    }

    public function update(User $user, Project $project): bool
    {
        return $user->role === 'admin' || $project->owner_id === $user->id;
    }

    public function delete(User $user, Project $project): bool
    {
        return $user->role === 'admin' || $project->owner_id === $user->id;
    }
}
