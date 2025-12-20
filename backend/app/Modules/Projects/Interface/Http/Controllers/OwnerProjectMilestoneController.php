<?php

namespace App\Modules\Projects\Interface\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Projects\Application\Services\ProjectMilestoneService;
use App\Modules\Projects\Infrastructure\Models\Project;
use App\Modules\Projects\Infrastructure\Models\ProjectMilestone;
use App\Modules\Projects\Interface\Http\Requests\StoreProjectMilestoneRequest;
use App\Modules\Projects\Interface\Http\Requests\UpdateProjectMilestoneRequest;
use Illuminate\Support\Facades\Auth;

class OwnerProjectMilestoneController extends Controller
{
    public function __construct(
        private readonly ProjectMilestoneService $milestoneService,
    ) {}

    public function index(Project $project)
    {
        $this->authorize('view', $project);

        $milestones = $this->milestoneService->listProjectMilestones($project);

        return response()->json([
            'data' => $milestones,
        ]);
    }

    public function store(StoreProjectMilestoneRequest $request, Project $project)
    {
        $user = Auth::user();
        $this->authorize('update', $project);

        $milestone = $this->milestoneService->createMilestone($user, $project, $request->validated());

        return response()->json([
            'message' => 'Milestone created successfully.',
            'data'    => $milestone,
        ], 201);
    }

    public function update(UpdateProjectMilestoneRequest $request, Project $project, ProjectMilestone $milestone)
    {
        $this->guardProjectMilestone($project, $milestone);

        $user = Auth::user();
        $this->authorize('update', $project);

        $updated = $this->milestoneService->updateMilestone($user, $milestone, $request->validated());

        return response()->json([
            'message' => 'Milestone updated successfully.',
            'data'    => $updated,
        ]);
    }

    public function destroy(Project $project, ProjectMilestone $milestone)
    {
        $this->guardProjectMilestone($project, $milestone);

        $user = Auth::user();
        $this->authorize('update', $project);

        $this->milestoneService->deleteMilestone($user, $milestone);

        return response()->json([
            'message' => 'Milestone deleted successfully.',
        ]);
    }

    private function guardProjectMilestone(Project $project, ProjectMilestone $milestone): void
    {
        if ($milestone->project_id !== $project->id) {
            abort(404, 'Milestone not found for this project.');
        }
    }
}
