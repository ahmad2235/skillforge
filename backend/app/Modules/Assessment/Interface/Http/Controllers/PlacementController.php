<?php

namespace App\Modules\Assessment\Interface\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Assessment\Application\Services\PlacementService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class PlacementController extends Controller
{
    public function __construct(
        private readonly PlacementService $placementService
    ) {}

    // GET /api/student/assessment/placement/questions
    public function getQuestions(Request $request)
    {
        $request->validate([
            'domain' => 'nullable|in:frontend,backend',
        ]);

        $user = Auth::user();

        // Prevent retake: check if active placement already exists
        $existingPlacement = \App\Modules\Assessment\Infrastructure\Models\PlacementResult::where('user_id', $user->id)
            ->where('is_active', true)
            ->first();

        if ($existingPlacement) {
            return response()->json([
                'message' => 'Placement already completed. Cannot retake.',
            ], 409);
        }

        $domain = $request->query('domain');
        $questions = $this->placementService->getQuestionsForUser($user, $domain);

        return response()->json([
            'data' => $questions,
        ]);
    }

    // POST /api/student/assessment/placement/submit
    public function submit(Request $request)
    {
        $user = Auth::user();

        // Prevent retake: check if active placement already exists
        $existingPlacement = \App\Modules\Assessment\Infrastructure\Models\PlacementResult::where('user_id', $user->id)
            ->where('is_active', true)
            ->first();

        if ($existingPlacement) {
            return response()->json([
                'message' => 'Placement already completed. Cannot retake.',
            ], 409);
        }

        $data = $request->validate([
            'answers'               => 'required|array|min:1',
            'answers.*.question_id' => 'required|integer|exists:questions,id',
            'answers.*.answer'      => 'nullable', // Allow empty and longer text answers
            'domain'                => 'nullable|in:frontend,backend',
        ]);

        $result = $this->placementService->submitAnswers($user, $data);

        // If evaluation is pending (async), return 202 Accepted with placement id
        if (isset($result['status']) && $result['status'] === 'pending') {
            return response()->json([
                'message' => $result['message'] ?? 'Placement is being processed.',
                'data'    => [ 'placement_result_id' => $result['placement_result_id'], 'status' => 'pending' ],
            ], 202);
        }

        return response()->json([
            'message' => 'Placement evaluated successfully.',
            'data'    => $result,
        ], 201);
    }

    // GET /api/student/assessment/placement/result/{id}
    public function getResult(Request $request, int $id)
    {
        $user = Auth::user();

        // Load placement directly to inspect status
        $placement = \App\Modules\Assessment\Infrastructure\Models\PlacementResult::where('id', $id)->where('user_id', $user->id)->first();

        if (!$placement) {
            return response()->json([
                'message' => 'Placement result not found.',
            ], 404);
        }

        // If still processing, return 202 Accepted
        if (in_array($placement->status, ['pending','processing'])) {
            return response()->json([
                'message' => 'Placement evaluation is in progress.',
                'data' => [ 'placement_result_id' => $placement->id, 'status' => $placement->status ]
            ], 202);
        }

        $result = $this->placementService->getPlacementResult($id, $user);

        return response()->json([
            'data' => $result,
        ]);
    }

    // GET /api/student/assessment/placement/latest
    public function getLatestResult(Request $request)
    {
        $user = Auth::user();

        $latestResult = \App\Modules\Assessment\Infrastructure\Models\PlacementResult::where('user_id', $user->id)
            ->where('is_active', true)
            ->orderByDesc('id') // Use id for reliable ordering
            ->first();

        if (!$latestResult) {
            return response()->json([
                'message' => 'No placement result found.',
                'data'    => null,
            ], 404);
        }

        // If processing, return 202 with status
        if (in_array($latestResult->status, ['pending','processing'])) {
            return response()->json([
                'message' => 'Placement evaluation is in progress.',
                'data' => [ 'placement_result_id' => $latestResult->id, 'status' => $latestResult->status ]
            ], 202);
        }

        $result = $this->placementService->getPlacementResult($latestResult->id, $user);

        return response()->json([
            'data' => $result,
        ]);
    }
}
