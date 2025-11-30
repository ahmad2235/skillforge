<?php

namespace App\Modules\Projects\Interface\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Projects\Application\Services\ProjectAssignmentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class StudentAssignmentController extends Controller
{
    public function __construct(
        private readonly ProjectAssignmentService $assignmentService
    ) {}

    /**
     * قائمة الـ assignments للطالب
     * GET /api/student/projects/assignments?status=invited
     */
    public function index(Request $request)
    {
        $student = Auth::user();

        $status      = $request->query('status'); // invited / accepted / completed ...
        $assignments = $this->assignmentService->listStudentAssignments($student, $status);

        return response()->json([
            'data' => $assignments,
        ]);
    }

    /**
     * قبول دعوة
     * POST /api/student/projects/assignments/{assignment}/accept
     */
    public function accept(int $assignmentId)
    {
        $student    = Auth::user();
        $assignment = $this->assignmentService->studentRespond($student, $assignmentId, 'accept');

        return response()->json([
            'message'    => 'Assignment accepted.',
            'assignment' => $assignment,
        ]);
    }

    /**
     * رفض دعوة
     * POST /api/student/projects/assignments/{assignment}/decline
     */
    public function decline(int $assignmentId)
    {
        $student    = Auth::user();
        $assignment = $this->assignmentService->studentRespond($student, $assignmentId, 'decline');

        return response()->json([
            'message'    => 'Assignment declined.',
            'assignment' => $assignment,
        ]);
    }

    /**
     * الطالب يضيف feedback + rating بعد ما الـ assignment يكون completed
     * POST /api/student/projects/assignments/{assignment}/feedback
     */
    public function feedback(Request $request, int $assignmentId)
    {
        $student = Auth::user();

        $data = $request->validate([
            'feedback' => 'nullable|string',
            'rating'   => 'nullable|integer|min:1|max:5',
        ]);

        $assignment = $this->assignmentService->studentFeedback(
            $student,
            $assignmentId,
            $data['feedback'] ?? null,
            $data['rating'] ?? null
        );

        return response()->json([
            'message'    => 'Feedback saved.',
            'assignment' => $assignment,
        ]);
    }
}
