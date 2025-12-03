<?php

namespace App\Modules\Identity\Interface\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Assessment\Infrastructure\Models\PlacementResult;
use App\Modules\Learning\Infrastructure\Models\RoadmapBlock;
use App\Modules\Learning\Infrastructure\Models\Task;
use App\Modules\Learning\Infrastructure\Models\Submission;
use App\Modules\Projects\Infrastructure\Models\Project;
use App\Modules\Projects\Infrastructure\Models\ProjectAssignment;
use App\Modules\AI\Infrastructure\Models\AiLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminMonitoringController extends Controller
{
    /**
     * Get overview stats for the admin dashboard
     */
    public function overview()
    {
        $stats = [
            'users' => [
                'total' => User::count(),
                'students' => User::where('role', 'student')->count(),
                'business' => User::where('role', 'business')->count(),
                'admins' => User::where('role', 'admin')->count(),
            ],
            'learning' => [
                'blocks' => RoadmapBlock::count(),
                'tasks' => Task::count(),
                'submissions' => Submission::count(),
            ],
            'projects' => [
                'total' => Project::count(),
                'assignments' => ProjectAssignment::count(),
            ],
            'assessments' => [
                'placement_results' => PlacementResult::count(),
            ],
            'ai' => [
                'total_logs' => AiLog::count(),
            ],
        ];

        return response()->json([
            'data' => $stats,
        ]);
    }

    /**
     * Get recent user registrations
     */
    public function recentUsers(Request $request)
    {
        $limit = $request->get('limit', 10);

        $users = User::select('id', 'name', 'email', 'role', 'level', 'domain', 'created_at')
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get();

        return response()->json([
            'data' => $users,
        ]);
    }

    /**
     * Get user distribution by role
     */
    public function usersByRole()
    {
        $distribution = User::select('role', DB::raw('count(*) as count'))
            ->groupBy('role')
            ->get();

        return response()->json([
            'data' => $distribution,
        ]);
    }

    /**
     * Get student distribution by level
     */
    public function studentsByLevel()
    {
        $distribution = User::where('role', 'student')
            ->select('level', DB::raw('count(*) as count'))
            ->groupBy('level')
            ->get();

        return response()->json([
            'data' => $distribution,
        ]);
    }

    /**
     * Get student distribution by domain
     */
    public function studentsByDomain()
    {
        $distribution = User::where('role', 'student')
            ->select('domain', DB::raw('count(*) as count'))
            ->groupBy('domain')
            ->get();

        return response()->json([
            'data' => $distribution,
        ]);
    }

    /**
     * Get recent submissions
     */
    public function recentSubmissions(Request $request)
    {
        $limit = $request->get('limit', 10);

        $submissions = Submission::with(['task:id,title', 'user:id,name,email'])
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get()
            ->map(function ($s) {
                return [
                    'id' => $s->id,
                    'task_title' => $s->task?->title ?? 'Unknown',
                    'user_name' => $s->user?->name ?? 'Unknown',
                    'user_email' => $s->user?->email ?? '',
                    'score' => $s->score,
                    'created_at' => $s->created_at,
                ];
            });

        return response()->json([
            'data' => $submissions,
        ]);
    }

    /**
     * Get recent AI logs
     */
    public function recentAiLogs(Request $request)
    {
        $limit = $request->get('limit', 10);

        $logs = AiLog::with(['user:id,name,email'])
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get()
            ->map(function ($log) {
                return [
                    'id' => $log->id,
                    'user_name' => $log->user?->name ?? 'System',
                    'action' => $log->action ?? $log->type ?? 'Unknown',
                    'tokens_used' => $log->tokens_used ?? 0,
                    'created_at' => $log->created_at,
                ];
            });

        return response()->json([
            'data' => $logs,
        ]);
    }

    /**
     * Get recent project assignments
     */
    public function recentAssignments(Request $request)
    {
        $limit = $request->get('limit', 10);

        $assignments = ProjectAssignment::with(['project:id,title', 'user:id,name,email'])
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get()
            ->map(function ($a) {
                return [
                    'id' => $a->id,
                    'project_title' => $a->project?->title ?? 'Unknown',
                    'student_name' => $a->user?->name ?? 'Unknown',
                    'status' => $a->status,
                    'created_at' => $a->created_at,
                ];
            });

        return response()->json([
            'data' => $assignments,
        ]);
    }
}