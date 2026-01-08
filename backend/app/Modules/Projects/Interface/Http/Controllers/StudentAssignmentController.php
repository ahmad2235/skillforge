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

        $status = $request->query('status'); // invited / accepted / completed ...
        
        // Map 'active' frontend status to backend statuses
        if ($status === 'active') {
            // You might want to include 'in_progress' if you add that status later
            $assignments = $this->assignmentService->listStudentAssignments($student, 'accepted');
        } else {
            $assignments = $this->assignmentService->listStudentAssignments($student, $status);
        }

        return response()->json([
            'data' => $assignments,
        ]);
    }

    /**
     * قبول دعوة بـ token
     * POST /api/student/projects/assignments/{assignment}/accept
     */
    public function accept(Request $request, int $assignmentId)
    {
        $student = Auth::user();
        
        $data = $request->validate([
            'token' => 'nullable|string|size:64',
        ]);

        if (!empty($data['token'])) {
            $assignment = $this->assignmentService->acceptInvitation(
                $student,
                $assignmentId,
                $data['token']
            );
        } else {
            // Allow students to accept pending invitations directly when authenticated
            $assignment = $this->assignmentService->acceptPendingAssignmentForStudent(
                $student,
                $assignmentId
            );
        }

        // Prepare response with team status info
        $response = [
            'message'    => 'Assignment accepted successfully.',
            'assignment' => $assignment,
        ];

        // Add team-specific messaging
        if ($assignment->team_id && isset($assignment->team_status)) {
            if ($assignment->team_status === 'partial') {
                $response['team_message'] = 'You have accepted this project. You can start working once all team members accept.';
            } elseif ($assignment->team_status === 'active') {
                $response['team_message'] = 'All team members have accepted. You can now start working on the project!';
            }
        }

        return response()->json($response);
    }

    /**
     * رفض دعوة
     * POST /api/student/projects/assignments/{assignment}/decline
     */
    public function decline(Request $request, int $assignmentId)
    {
        $student    = Auth::user();
        $assignment = $this->assignmentService->declineInvitation($student, $assignmentId);

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
