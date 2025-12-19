<?php

namespace App\Providers;

use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use App\Modules\Learning\Infrastructure\Models\Submission;
use App\Modules\Projects\Infrastructure\Models\Project;
use App\Modules\Projects\Infrastructure\Models\ProjectAssignment;
use App\Modules\Gamification\Infrastructure\Models\Portfolio;
use App\Policies\SubmissionPolicy;
use App\Policies\ProjectPolicy;
use App\Policies\ProjectAssignmentPolicy;
use App\Policies\PortfolioPolicy;

class AuthServiceProvider extends ServiceProvider
{
    protected $policies = [
        Submission::class        => SubmissionPolicy::class,
        Project::class           => ProjectPolicy::class,
        ProjectAssignment::class => ProjectAssignmentPolicy::class,
        Portfolio::class         => PortfolioPolicy::class,
    ];

    public function boot(): void
    {
        $this->registerPolicies();
    }
}
