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
        $user = Auth::user();

        $questions = $this->placementService->getQuestionsForUser($user);

        return response()->json([
            'data' => $questions,
        ]);
    }

    // POST /api/student/assessment/placement/submit
    public function submit(Request $request)
    {
        $user = Auth::user();

        $data = $request->validate([
            'answers'               => 'required|array|min:1',
            'answers.*.question_id' => 'required|integer|exists:questions,id',
            'answers.*.answer'      => 'required|string|max:255',
            'domain'                => 'nullable|in:frontend,backend',
        ]);

        $result = $this->placementService->submitAnswers($user, $data);

        return response()->json([
            'message' => 'Placement evaluated successfully.',
            'data'    => $result,
        ], 201);
    }
}
