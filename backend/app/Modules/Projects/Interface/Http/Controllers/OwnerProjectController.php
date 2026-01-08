<?php

namespace App\Modules\Projects\Interface\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\AI\Application\Services\ProjectLevelerService;
use App\Modules\Projects\Application\Services\ProjectMilestoneService;
use App\Modules\Projects\Application\Services\ProjectService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class OwnerProjectController extends Controller
{
    public function __construct(
        private readonly ProjectService $projectService,
        private readonly ProjectLevelerService $projectLevelerService,
        private readonly ProjectMilestoneService $projectMilestoneService
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
     * 
     * Now supports 'complexity' field which can be:
     * - Manually set by business owner
     * - Auto-populated from PDF analysis via /analyze-pdf endpoint
     */
    public function store(Request $request)
    {
        $user = Auth::user();

        $data = $request->validate([
            'domain'                   => 'required_without:requirements_pdf|in:frontend,backend,fullstack',
            'required_level'           => 'nullable|in:beginner,intermediate,advanced',
            'complexity'               => 'nullable|in:low,medium,high', // New field for recommender
            'title'                    => 'required_without:requirements_pdf|string|max:150',
            'description'              => 'nullable|string',
            'requirements_pdf'         => 'sometimes|file|mimes:pdf|max:10240',
            'min_score_required'       => 'nullable|numeric|min:0',
            'status'                   => 'nullable|in:draft,open,in_progress,completed,cancelled',
            'min_team_size'            => 'nullable|integer|min:1',
            'max_team_size'            => 'nullable|integer|min:1',
            'estimated_duration_weeks' => 'nullable|integer|min:1',
            'metadata'                 => 'nullable|array',
            'auto_create_milestones'   => 'sometimes|boolean',
        ]);

        $metadata = $data['metadata'] ?? [];
        $pdfFile = $request->file('requirements_pdf');

        if ($pdfFile) {
            // Run leveler to auto-suggest fields
            $analysis = $this->projectLevelerService->evaluatePdf($pdfFile);

            if ($analysis['success'] ?? false) {
                $metadata['leveler'] = $analysis['data'];
                $data['domain'] = $data['domain'] ?? ($analysis['data']['domain'] ?? null);
                $data['required_level'] = $data['required_level'] ?? ($analysis['data']['required_level'] ?? null);
                $data['complexity'] = $data['complexity'] ?? ($analysis['data']['complexity'] ?? null);
                // Fill title/description if missing
                $data['title'] = $data['title'] ?? ($analysis['data']['title'] ?? null);
                $data['description'] = $data['description'] ?? ($analysis['data']['description'] ?? null);
            } else {
                $metadata['leveler_error'] = $analysis['error'] ?? 'Project leveler failed.';
            }

            // Store PDF for future reference
            $data['requirements_pdf_path'] = $pdfFile->store('project-requirements', 'public');
        }

        $data['metadata'] = $metadata;

        // Ensure domain is resolved either from user input or leveler
        if (empty($data['domain'])) {
            return response()->json([
                'message' => 'Domain is required. Provide it manually or upload a PDF that contains a detectable domain.',
            ], 422);
        }

        // Ensure title is present (user or leveler)
        if (empty($data['title'])) {
            return response()->json([
                'message' => 'Title is required. Provide it manually or upload a PDF that contains a detectable title.',
            ], 422);
        }

        $project = $this->projectService->createProject($user, $data);

        // Only auto-create milestones if the user allowed it (default true)
        $autoCreate = array_key_exists('auto_create_milestones', $data) ? (bool) $data['auto_create_milestones'] : true;
        if ($autoCreate) {
            $milestoneSuggestions = $metadata['leveler']['milestones'] ?? [];
            foreach ($milestoneSuggestions as $milestone) {
                $this->projectMilestoneService->createMilestone($user, $project, [
                    'title' => $milestone['title'],
                    'description' => $milestone['description'] ?? null,
                    'order_index' => $milestone['order_index'] ?? null,
                    'is_required' => $milestone['is_required'] ?? true,
                ]);
            }
        }

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
            'domain'                   => 'sometimes|in:frontend,backend,fullstack',
            'required_level'           => 'sometimes|nullable|in:beginner,intermediate,advanced',
            'complexity'               => 'sometimes|nullable|in:low,medium,high', // For recommender
            'title'                    => 'sometimes|string|max:150',
            'description'              => 'sometimes|string',
            'requirements_pdf'         => 'sometimes|file|mimes:pdf|max:10240',
            'min_score_required'       => 'sometimes|nullable|numeric|min:0',
            'status'                   => 'sometimes|in:draft,open,in_progress,completed,cancelled',
            'min_team_size'            => 'sometimes|nullable|integer|min:1',
            'max_team_size'            => 'sometimes|nullable|integer|min:1',
            'estimated_duration_weeks' => 'sometimes|nullable|integer|min:1',
            'metadata'                 => 'sometimes|nullable|array',
        ]);

        $metadata = $data['metadata'] ?? [];
        $pdfFile = $request->file('requirements_pdf');

        if ($pdfFile) {
            $analysis = $this->projectLevelerService->evaluatePdf($pdfFile);

            if ($analysis['success'] ?? false) {
                $metadata['leveler'] = $analysis['data'];
                // Only set fields if not provided in the request (respect manual overrides)
                if (!array_key_exists('domain', $data)) {
                    $data['domain'] = $analysis['data']['domain'] ?? null;
                }
                if (!array_key_exists('required_level', $data)) {
                    $data['required_level'] = $analysis['data']['required_level'] ?? null;
                }
                if (!array_key_exists('complexity', $data)) {
                    $data['complexity'] = $analysis['data']['complexity'] ?? null;
                }
                if (!array_key_exists('title', $data)) {
                    $data['title'] = $analysis['data']['title'] ?? null;
                }
                if (!array_key_exists('description', $data)) {
                    $data['description'] = $analysis['data']['description'] ?? null;
                }
            } else {
                $metadata['leveler_error'] = $analysis['error'] ?? 'Project leveler failed.';
            }

            $data['requirements_pdf_path'] = $pdfFile->store('project-requirements', 'public');
        }

        if (!empty($metadata)) {
            $data['metadata'] = $metadata;
        }

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
