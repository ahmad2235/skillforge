<?php

namespace App\Modules\Projects\Interface\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Projects\Application\Services\ProjectService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class OwnerProjectController extends Controller
{
    public function __construct(
        private readonly ProjectService $projectService
    ) {}

    /**
     * قائمة مشاريع صاحب العمل
     * GET /api/business/projects?status=open
     */
    public function index(Request $request)
    {
        $user = Auth::user(); // لازم يكون role = business

        $status   = $request->query('status'); // optional
        $projects = $this->projectService->listOwnerProjects($user, $status);

        return response()->json([
            'data' => $projects,
        ]);
    }

    /**
     * إنشاء مشروع جديد
     * POST /api/business/projects
     */
    public function store(Request $request)
    {
        $user = Auth::user();

        $data = $request->validate([
            'domain'                   => 'required|in:frontend,backend',
            'required_level'           => 'nullable|in:beginner,intermediate,advanced',
            'title'                    => 'required|string|max:150',
            'description'              => 'required|string',
            'min_score_required'       => 'nullable|numeric|min:0',
            'status'                   => 'nullable|in:draft,open,in_progress,completed,cancelled',
            'min_team_size'            => 'nullable|integer|min:1',
            'max_team_size'            => 'nullable|integer|min:1',
            'estimated_duration_weeks' => 'nullable|integer|min:1',
            'metadata'                 => 'nullable|array',
        ]);

        $project = $this->projectService->createProject($user, $data);

        return response()->json([
            'message' => 'Project created successfully.',
            'data'    => $project,
        ], 201);
    }

    /**
     * عرض مشروع واحد
     * GET /api/business/projects/{project}
     */
    public function show(int $projectId)
    {
        $user    = Auth::user();
        $project = $this->projectService->getOwnerProject($user, $projectId);
        $this->authorize('view', $project);

        return response()->json([
            'data' => $project,
        ]);
    }

    /**
     * تحديث مشروع
     * PUT /api/business/projects/{project}
     */
    public function update(Request $request, int $projectId)
    {
        $user = Auth::user();

        $data = $request->validate([
            'domain'                   => 'sometimes|in:frontend,backend',
            'required_level'           => 'sometimes|nullable|in:beginner,intermediate,advanced',
            'title'                    => 'sometimes|string|max:150',
            'description'              => 'sometimes|string',
            'min_score_required'       => 'sometimes|nullable|numeric|min:0',
            'status'                   => 'sometimes|in:draft,open,in_progress,completed,cancelled',
            'min_team_size'            => 'sometimes|nullable|integer|min:1',
            'max_team_size'            => 'sometimes|nullable|integer|min:1',
            'estimated_duration_weeks' => 'sometimes|nullable|integer|min:1',
            'metadata'                 => 'sometimes|nullable|array',
        ]);

        $project = $this->projectService->updateProject($user, $projectId, $data);
        $this->authorize('update', $project);

        return response()->json([
            'message' => 'Project updated successfully.',
            'data'    => $project,
        ]);
    }

    /**
     * تغيير حالة المشروع فقط
     * POST /api/business/projects/{project}/status
     */
    public function changeStatus(Request $request, int $projectId)
    {
        $user = Auth::user();

        $data = $request->validate([
            'status' => 'required|in:draft,open,in_progress,completed,cancelled',
        ]);

        $project = $this->projectService->changeStatus($user, $projectId, $data['status']);
        $this->authorize('update', $project);

        return response()->json([
            'message' => 'Project status updated.',
            'data'    => $project,
        ]);
    }

    /**
     * حذف مشروع
     * DELETE /api/business/projects/{project}
     */
    public function destroy(int $projectId)
    {
        $user = Auth::user();

        $this->projectService->deleteProject($user, $projectId);

        return response()->json([
            'message' => 'Project deleted successfully.',
        ]);
    }
}
