<?php

namespace App\Modules\Projects\Interface\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Projects\Application\Services\ProjectAdminService;
use App\Modules\Projects\Infrastructure\Models\Project;
use App\Modules\Projects\Interface\Http\Requests\UpdateAdminProjectRequest;
use Illuminate\Http\Request;

class AdminProjectController extends Controller
{
    public function __construct(
        private readonly ProjectAdminService $adminService,
    ) {}

    public function index(Request $request)
    {
        $filters = $request->only(['status', 'domain', 'required_level']);
        $perPage = (int) $request->query('per_page', 10);

        $projects = $this->adminService->listProjects($filters, $perPage);

        return response()->json($projects);
    }

    public function update(UpdateAdminProjectRequest $request, Project $project)
    {
        $updated = $this->adminService->updateProject($project, $request->validated());

        return response()->json([
            'message' => 'Project updated successfully.',
            'data'    => $updated,
        ]);
    }

    public function destroy(Project $project)
    {
        $this->adminService->deleteProject($project);

        return response()->json([
            'message' => 'Project cancelled successfully.',
        ]);
    }
}
