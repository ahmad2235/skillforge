<?php

namespace App\Modules\Learning\Interface\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Learning\Application\Services\RoadmapService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;


class StudentRoadmapController extends Controller
{
    public function __construct(
        private readonly RoadmapService $roadmapService
    ) {}

    /**
     * رجّع roadmap الطالب حسب level + domain
     */
    public function index(Request $request)
    {
        $user = Auth::user();

        $blocks = $this->roadmapService->getStudentRoadmap($user);

        if ($blocks->isEmpty()) {
            return response()->json([
                'message' => 'No roadmap available. Make sure placement is completed and level/domain are set.',
                'data'    => [],
            ]);
        }

        return response()->json([
            'data' => $blocks,
        ]);
    }

    public function startBlock(int $blockId)
{
    $user = Auth::user();

    $userBlock = $this->roadmapService->startBlock($user, $blockId);

    return response()->json([
        'message'    => 'Block started.',
        'user_block' => $userBlock,
    ]);
}

public function completeBlock(int $blockId)
{
    $user = Auth::user();

    $userBlock = $this->roadmapService->completeBlock($user, $blockId);

    return response()->json([
        'message'    => 'Block marked as completed.',
        'user_block' => $userBlock,
    ]);
}


}
