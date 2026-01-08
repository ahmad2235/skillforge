<?php

namespace App\Policies;

use App\Models\User;
use App\Modules\Gamification\Infrastructure\Models\Portfolio;

class PortfolioPolicy
{
    public function viewAny(User $user): bool
    {
        return true; // All authenticated users can list their portfolios
    }

    public function view(User $user, Portfolio $portfolio): bool
    {
        return $user->role === 'admin' || $portfolio->user_id === $user->id || $portfolio->is_public;
    }

    public function create(User $user): bool
    {
        return $user->role === 'student' || $user->role === 'admin';
    }

    public function update(User $user, Portfolio $portfolio): bool
    {
        return $user->role === 'admin' || $portfolio->user_id === $user->id;
    }

    public function delete(User $user, Portfolio $portfolio): bool
    {
        return $user->role === 'admin' || $portfolio->user_id === $user->id;
    }

    public function restore(User $user, Portfolio $portfolio): bool
    {
        return $user->role === 'admin';
    }

    public function forceDelete(User $user, Portfolio $portfolio): bool
    {
        return $user->role === 'admin';
    }
}

