<?php

namespace App\Policies;

use App\Models\User;
use App\Modules\Gamification\Infrastructure\Models\Portfolio;

class PortfolioPolicy
{
    public function view(User $user, Portfolio $portfolio): bool
    {
        return $user->role === 'admin' || $portfolio->user_id === $user->id;
    }

    public function update(User $user, Portfolio $portfolio): bool
    {
        return $user->role === 'admin' || $portfolio->user_id === $user->id;
    }
}
