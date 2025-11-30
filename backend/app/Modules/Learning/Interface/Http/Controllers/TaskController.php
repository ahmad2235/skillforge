<?php

namespace App\Modules\Learning\Interface\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Learning\Application\Services\RoadmapService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class TaskController extends Controller
{
    public function __construct(
        private readonly RoadmapService $roadmapService
    ) {}

    /**
     * رجّع tasks لبلوك معيّن
     */
    public function listByBlock(int $blockId)
    {
        $user = Auth::user();

        $tasks = $this->roadmapService->getTasksForBlock($user, $blockId);

        return response()->json([
            'data' => $tasks,
        ]);
    }

    /**
     * الطالب يرسل حل الـ task
     */
    public function submit(Request $request, int $taskId)
    {
        $request->validate([
            'answer_text'    => 'nullable|string',
            'attachment_url' => 'nullable|url',
        ]);

        $user = Auth::user();

        $result = $this->roadmapService->submitTask($user, $taskId, $request->only([
            'answer_text',
            'attachment_url',
        ]));

        return response()->json([
            'message'    => 'Task submitted successfully.',
            'submission' => $result['submission'],
            'evaluation' => $result['evaluation'],
        ]);
    }
}
