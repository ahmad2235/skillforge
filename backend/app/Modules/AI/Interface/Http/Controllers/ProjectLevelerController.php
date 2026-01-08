<?php

namespace App\Modules\AI\Interface\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\AI\Application\Services\ProjectLevelerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Project Leveler Controller
 * 
 * Provides API endpoints for PDF project analysis functionality.
 * Business owners can upload PDF project descriptions to automatically
 * extract domain, required_level, and complexity information.
 * 
 * Endpoints:
 * - POST /api/business/projects/analyze-pdf - Analyze a PDF and get suggestions
 * - GET /api/business/projects/leveler-health - Check if leveler service is available
 */
class ProjectLevelerController extends Controller
{
    public function __construct(
        private readonly ProjectLevelerService $levelerService
    ) {}

    /**
     * Analyze a PDF project description.
     * 
     * POST /api/business/projects/analyze-pdf
     * 
     * Request: multipart/form-data with 'pdf' file field
     * Response: JSON with domain, required_level, complexity, and other metadata
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function analyzePdf(Request $request): JsonResponse
    {
        $request->validate([
            'pdf' => 'required|file|mimes:pdf|max:10240', // Max 10MB
        ]);

        $pdf = $request->file('pdf');

        $result = $this->levelerService->evaluatePdf($pdf);

        if (!$result['success']) {
            return response()->json([
                'success' => false,
                'message' => $result['error'],
            ], 422);
        }

        return response()->json([
            'success' => true,
            'message' => 'PDF analyzed successfully.',
            'data' => $result['data'],
            // Also provide pre-extracted fields for easy form population
            'suggested_fields' => $this->levelerService->extractProjectFields($result),
        ]);
    }

    /**
     * Check if the project leveler service is available.
     * 
     * GET /api/business/projects/leveler-health
     * 
     * Useful for UI to show/hide PDF analysis feature based on availability.
     *
     * @return JsonResponse
     */
    public function health(): JsonResponse
    {
        $isHealthy = $this->levelerService->isHealthy();

        return response()->json([
            'available' => $isHealthy,
            'service' => 'project_leveler',
            'message' => $isHealthy 
                ? 'Project leveler service is available.' 
                : 'Project leveler service is currently unavailable.',
        ], $isHealthy ? 200 : 503);
    }
}
