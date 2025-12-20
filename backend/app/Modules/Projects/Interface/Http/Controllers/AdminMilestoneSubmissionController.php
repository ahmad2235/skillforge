<?php

namespace App\Modules\Projects\Interface\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Projects\Application\Services\ProjectMilestoneSubmissionService;
use App\Modules\Projects\Infrastructure\Models\ProjectMilestoneSubmission;
use App\Modules\Projects\Interface\Http\Requests\ReviewProjectMilestoneSubmissionRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AdminMilestoneSubmissionController extends Controller
{
    public function __construct(
        private readonly ProjectMilestoneSubmissionService $submissionService,
    ) {}

    public function index(Request $request)
    {
        $status    = $request->query('status');
        $projectId = $request->query('project_id');

        $submissions = $this->submissionService->listSubmissionsForAdmin($status, $projectId);

        return response()->json([
            'data' => $submissions,
        ]);
    }

    public function review(ReviewProjectMilestoneSubmissionRequest $request, int $submissionId)
    {
        $admin = Auth::user();

        $submission = ProjectMilestoneSubmission::with(['milestone', 'assignment.project', 'user'])
            ->findOrFail($submissionId);

        $data = $request->validated();

        $updated = $this->submissionService->reviewSubmission(
            $admin,
            $submission,
            $data['status'],
            $data['feedback'] ?? null
        );

        return response()->json([
            'message'    => 'Submission reviewed.',
            'submission' => $updated,
        ]);
    }
}
