<?php

namespace App\Policies;

use App\Models\User;
use App\Modules\Projects\Infrastructure\Models\ProjectAssignment;

class ProjectAssignmentPolicy
{
    public function view(User $user, ProjectAssignment $assignment): bool
    {
        return $user->role === 'admin'
            || $assignment->user_id === $user->id
            || ($assignment->project && $assignment->project->owner_id === $user->id);
    }

    public function update(User $user, ProjectAssignment $assignment): bool
    {
        return $user->role === 'admin'
            || $assignment->user_id === $user->id
            || ($assignment->project && $assignment->project->owner_id === $user->id);
    }
}
