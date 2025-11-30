<?php

namespace App\Modules\Gamification\Interface\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Gamification\Application\Services\PortfolioService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class StudentPortfolioController extends Controller
{
    public function __construct(
        private readonly PortfolioService $portfolioService
    ) {}

    /**
     * الطالب يشوف كل الـ portfolio items تبعه
     * GET /api/student/portfolios
     */
    public function index()
    {
        $student    = Auth::user();
        $portfolios = $this->portfolioService->listForStudent($student);

        return response()->json([
            'data' => $portfolios,
        ]);
    }

    /**
     * إنشاء portfolio من assignment مكتمل
     * POST /api/student/projects/assignments/{assignment}/portfolio
     */
    public function storeFromAssignment(Request $request, int $assignmentId)
    {
        $student = Auth::user();

        $data = $request->validate([
            'title'         => 'nullable|string|max:200',
            'description'   => 'nullable|string',
            'github_url'    => 'nullable|url',
            'live_demo_url' => 'nullable|url',
            'score'         => 'nullable|numeric|min:0',
            'feedback'      => 'nullable|string',
            'is_public'     => 'nullable|boolean',
            'metadata'      => 'nullable|array',
        ]);

        $portfolio = $this->portfolioService->createFromAssignment(
            $student,
            $assignmentId,
            $data
        );

        return response()->json([
            'message'   => 'Portfolio item created successfully.',
            'portfolio' => $portfolio,
        ], 201);
    }
}
