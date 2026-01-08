<?php

namespace App\Modules\Gamification\Interface\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Gamification\Application\Services\PortfolioService;
use App\Modules\Gamification\Application\Services\PortfolioPdfExportService;
use App\Modules\Gamification\Infrastructure\Models\Portfolio;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\StreamedResponse;

class StudentPortfolioController extends Controller
{
    public function __construct(
        private readonly PortfolioService $portfolioService,
        private readonly PortfolioPdfExportService $pdfExportService
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
     * الحصول على portfolio item محدد
     * GET /api/student/portfolios/{id}
     */
    public function show(int $id)
    {
        $portfolio = $this->portfolioService->getById($id);
        $student = Auth::user();

        // التحقق من الصلاحيات
        if ($portfolio->user_id !== $student->id && $student->role !== 'admin' && !$portfolio->is_public) {
            abort(403, 'Unauthorized to view this portfolio item.');
        }

        return response()->json([
            'data' => $portfolio,
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
            'description'   => 'nullable|string|max:2000',
            'github_url'    => 'nullable|url|max:255',
            'live_demo_url' => 'nullable|url|max:255',
            'score'         => 'nullable|numeric|min:0|max:100',
            'feedback'      => 'nullable|string|max:2000',
            'is_public'     => 'nullable|boolean',
            'category'      => 'nullable|string|max:100',
            'tags'          => 'nullable|array|max:10',
            'tags.*'        => 'string|max:50',
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

    /**
     * إنشاء portfolio item جديد (ad-hoc, بدون assignment)
     * POST /api/student/portfolios
     */
    public function store(Request $request)
    {
        $student = Auth::user();

        $data = $request->validate([
            'title'            => 'required|string|max:200',
            'description'      => 'nullable|string|max:2000',
            'github_url'       => 'nullable|url|max:255',
            'live_demo_url'    => 'nullable|url|max:255',
            'score'            => 'nullable|numeric|min:0|max:100',
            'feedback'         => 'nullable|string|max:2000',
            'is_public'        => 'nullable|boolean',
            'category'         => 'nullable|string|max:100',
            'tags'             => 'nullable|array|max:10',
            'tags.*'           => 'string|max:50',
            'project_id'       => 'nullable|integer',
            'level_project_id' => 'nullable|integer',
        ]);

        $portfolio = $this->portfolioService->createAdHoc($student, $data);

        return response()->json([
            'message'   => 'Portfolio item created successfully.',
            'portfolio' => $portfolio,
        ], 201);
    }

    /**
     * تحديث portfolio item
     * PUT /api/student/portfolios/{id}
     */
    public function update(Request $request, int $id)
    {
        $student = Auth::user();

        $data = $request->validate([
            'title'       => 'nullable|string|max:200',
            'description' => 'nullable|string|max:2000',
            'github_url'  => 'nullable|url|max:255',
            'live_demo_url' => 'nullable|url|max:255',
            'score'       => 'nullable|numeric|min:0|max:100',
            'feedback'    => 'nullable|string|max:2000',
            'is_public'   => 'nullable|boolean',
            'category'    => 'nullable|string|max:100',
            'tags'        => 'nullable|array|max:10',
            'tags.*'      => 'string|max:50',
        ]);

        $portfolio = $this->portfolioService->update($id, $student, $data);

        return response()->json([
            'message'   => 'Portfolio item updated successfully.',
            'portfolio' => $portfolio,
        ]);
    }

    /**
     * حذف portfolio item
     * DELETE /api/student/portfolios/{id}
     */
    public function destroy(int $id)
    {
        $student = Auth::user();

        $this->portfolioService->delete($id, $student);

        return response()->json([
            'message' => 'Portfolio item deleted successfully.',
        ]);
    }

    /**
     * تبديل visibility (is_public)
     * PATCH /api/student/portfolios/{id}/visibility
     */
    public function toggleVisibility(int $id)
    {
        $student = Auth::user();

        $portfolio = $this->portfolioService->toggleVisibility($id, $student);

        return response()->json([
            'message'   => 'Portfolio visibility toggled successfully.',
            'portfolio' => $portfolio,
        ]);
    }

    /**
     * الحصول على معلومات مستوى الطالب
     * GET /api/student/portfolios/info/level
     */
    public function getLevelInfo()
    {
        $student = Auth::user();
        $levelInfo = $this->portfolioService->getStudentLevelInfo($student);

        return response()->json([
            'data' => $levelInfo,
        ]);
    }

    /**
     * تصدير portfolio item كـ PDF
     * GET /api/student/portfolios/{id}/export-pdf
     */
    public function exportPdf(int $id): StreamedResponse
    {
        $portfolio = $this->portfolioService->getById($id);
        $student = Auth::user();

        $pdfContent = $this->pdfExportService->exportPortfolio($portfolio, $student);

        return response()->streamDownload(
            function () use ($pdfContent) {
                echo $pdfContent;
            },
            'portfolio-' . $portfolio->id . '.pdf',
            [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'attachment; filename="portfolio-' . $portfolio->id . '.pdf"',
            ]
        );
    }

    /**
     * تصدير عدة portfolio items كـ PDF
     * POST /api/student/portfolios/export-pdf/multiple
     */
    public function exportMultiplePdf(Request $request): StreamedResponse
    {
        $student = Auth::user();

        $data = $request->validate([
            'portfolio_ids' => 'required|array',
            'portfolio_ids.*' => 'integer',
        ]);

        $pdfContent = $this->pdfExportService->exportMultiple($data['portfolio_ids'], $student);

        return response()->streamDownload(
            function () use ($pdfContent) {
                echo $pdfContent;
            },
            'portfolio-' . now()->format('Y-m-d') . '.pdf',
            [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'attachment; filename="portfolio-' . now()->format('Y-m-d') . '.pdf"',
            ]
        );
    }
}


