<?php

namespace App\Policies;

use App\Models\User;
use App\Modules\Learning\Infrastructure\Models\Submission;

class SubmissionPolicy
{
    public function view(User $user, Submission $submission): bool
    {
        return $user->role === 'admin' || $submission->user_id === $user->id;
    }

    public function update(User $user, Submission $submission): bool
    {
        return $user->role === 'admin' || $submission->user_id === $user->id;
    }
}
