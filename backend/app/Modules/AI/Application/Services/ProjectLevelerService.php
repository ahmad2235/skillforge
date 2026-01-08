<?php

namespace App\Modules\AI\Application\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Project Leveler Service
 * 
 * Communicates with the Python FastAPI project_leveler microservice
 * to analyze PDF project descriptions and extract:
 * - domain (backend, frontend, fullstack)
 * - required_level (beginner, intermediate, advanced)
 * - complexity (low, medium, high)
 * - language_or_framework suggestions
 * - estimates (UI pages, DB tables)
 * 
 * This service provides graceful error handling and fallback behavior
 * when the microservice is unavailable.
 */
class ProjectLevelerService
{
    private string $baseUrl;
    private int $timeout;
    private int $connectTimeout;

    public function __construct()
    {
        $this->baseUrl = config('services.project_leveler.url', 'http://localhost:8001');
        $this->timeout = (int) config('services.project_leveler.timeout', 60);
        $this->connectTimeout = (int) config('services.project_leveler.connect_timeout', 5);
    }

    /**
     * Check if the project leveler service is healthy.
     *
     * @return bool True if service is responding
     */
    public function isHealthy(): bool
    {
        try {
            $response = Http::timeout(3)
                ->connectTimeout(2)
                ->get("{$this->baseUrl}/health");

            return $response->successful() && 
                   ($response->json('status') === 'ok');
        } catch (\Exception $e) {
            Log::warning('ProjectLeveler health check failed', [
                'error' => $e->getMessage(),
                'url' => $this->baseUrl,
            ]);
            return false;
        }
    }

    /**
     * Evaluate a PDF project description using AI.
     *
     * @param UploadedFile $pdf The uploaded PDF file
     * @return array{success: bool, data?: array, error?: string}
     */
    public function evaluatePdf(UploadedFile $pdf): array
    {
        // Validate file type
        if ($pdf->getClientOriginalExtension() !== 'pdf') {
            return [
                'success' => false,
                'error' => 'Only PDF files are supported.',
            ];
        }

        // Validate file size (max 10MB)
        if ($pdf->getSize() > 10 * 1024 * 1024) {
            return [
                'success' => false,
                'error' => 'PDF file size must be less than 10MB.',
            ];
        }

        try {
            $response = Http::timeout($this->timeout)
                ->connectTimeout($this->connectTimeout)
                ->attach(
                    'file',
                    file_get_contents($pdf->getRealPath()),
                    $pdf->getClientOriginalName()
                )
                ->post("{$this->baseUrl}/evaluate-pdf");

            if ($response->failed()) {
                $errorDetail = $response->json('detail', 'Unknown error from leveler service');
                
                Log::error('ProjectLeveler PDF evaluation failed', [
                    'status' => $response->status(),
                    'error' => $errorDetail,
                ]);

                return [
                    'success' => false,
                    'error' => $errorDetail,
                ];
            }

            $result = $response->json();

            // Validate response structure
            if (!isset($result['success']) || !$result['success']) {
                return [
                    'success' => false,
                    'error' => $result['error'] ?? 'Invalid response from leveler service',
                ];
            }

            // Normalize and validate the data
            $data = $this->normalizeResult($result['data'] ?? []);

            Log::info('ProjectLeveler PDF evaluation successful', [
                'filename' => $pdf->getClientOriginalName(),
                'result' => $data,
            ]);

            return [
                'success' => true,
                'data' => $data,
            ];

        } catch (ConnectionException $e) {
            Log::error('ProjectLeveler connection failed', [
                'error' => $e->getMessage(),
                'url' => $this->baseUrl,
            ]);

            return [
                'success' => false,
                'error' => 'Project leveler service is unavailable. Please try again later.',
            ];
        } catch (\Exception $e) {
            Log::error('ProjectLeveler unexpected error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return [
                'success' => false,
                'error' => 'An unexpected error occurred while analyzing the PDF.',
            ];
        }
    }

    /**
     * Normalize and validate the result from the leveler service.
     * Ensures all expected fields are present with valid values.
     *
     * @param array $data Raw data from leveler service
     * @return array Normalized data
     */
    private function normalizeResult(array $data): array
    {
        // Valid enum values for validation
        $validDomains = ['backend', 'frontend', 'fullstack'];
        $validLevels = ['beginner', 'intermediate', 'advanced'];
        $validComplexities = ['low', 'medium', 'high'];

        // Normalize domain - accept fullstack as a valid domain
        $domain = strtolower($data['domain'] ?? 'backend');
        if (!in_array($domain, $validDomains)) {
            $domain = 'backend';
        }
        // Keep fullstack as-is (system now supports it)

        // Normalize required_level
        $level = strtolower($data['required_level'] ?? 'beginner');
        if (!in_array($level, $validLevels)) {
            $level = 'beginner';
        }

        // Normalize complexity
        $complexity = strtolower($data['complexity'] ?? 'low');
        if (!in_array($complexity, $validComplexities)) {
            $complexity = 'low';
        }

        // Sanitize title/description suggestions
        $title = trim((string)($data['title'] ?? ''));
        if (mb_strlen($title) > 150) {
            $title = mb_substr($title, 0, 150);
        }
        $description = trim((string)($data['description'] ?? ''));
        if (mb_strlen($description) > 2000) {
            $description = mb_substr($description, 0, 2000);
        }

        $milestones = [];
        if (is_array($data['milestones'] ?? null)) {
            foreach ($data['milestones'] as $index => $milestone) {
                if (!is_array($milestone)) {
                    continue;
                }

                $titleValue = trim((string)($milestone['title'] ?? ''));
                if ($titleValue === '') {
                    continue;
                }
                if (mb_strlen($titleValue) > 150) {
                    $titleValue = mb_substr($titleValue, 0, 150);
                }

                $descriptionValue = trim((string)($milestone['description'] ?? ''));
                if ($descriptionValue !== '' && mb_strlen($descriptionValue) > 1000) {
                    $descriptionValue = mb_substr($descriptionValue, 0, 1000);
                }

                $dueInWeeks = $milestone['due_in_weeks'] ?? null;
                if (is_numeric($dueInWeeks)) {
                    $dueInWeeks = max(0, (int) $dueInWeeks);
                } else {
                    $dueInWeeks = null;
                }

                $isRequiredRaw = $milestone['is_required'] ?? true;
                $isRequired = filter_var($isRequiredRaw, FILTER_VALIDATE_BOOL, FILTER_NULL_ON_FAILURE);
                if ($isRequired === null) {
                    $isRequired = true;
                }

                $milestones[] = [
                    'title' => $titleValue,
                    'description' => $descriptionValue ?: null,
                    'order_index' => $index + 1,
                    'due_in_weeks' => $dueInWeeks,
                    'is_required' => $isRequired,
                ];

                if (count($milestones) >= 10) {
                    break;
                }
            }
        }

        return [
            'domain' => $domain,
            'required_level' => $level,
            'complexity' => $complexity,
            'title' => $title,
            'description' => $description,
            'language_or_framework' => $data['language_or_framework'] ?? [],
            'estimates' => [
                'pdf_pages' => (int) ($data['estimates']['pdf_pages'] ?? 0),
                'ui_pages' => $data['estimates']['ui_pages'] ?? ['min' => 0, 'max' => 0],
                'db_tables' => $data['estimates']['db_tables'] ?? ['min' => 0, 'max' => 0],
                'db_size' => $data['estimates']['db_size'] ?? 'small',
            ],
            'reasons' => [
                'required_level' => $data['reasons']['required_level'] ?? '',
                'complexity' => $data['reasons']['complexity'] ?? '',
                'language_or_framework' => $data['reasons']['language_or_framework'] ?? '',
            ],
            'milestones' => $milestones,
        ];
    }

    /**
     * Extract only the fields needed for project creation.
     * 
     * @param array $evaluation Full evaluation result
     * @return array Fields for project creation: domain, required_level, complexity
     */
    public function extractProjectFields(array $evaluation): array
    {
        if (!$evaluation['success'] || !isset($evaluation['data'])) {
            return [];
        }

        return [
            'domain' => $evaluation['data']['domain'],
            'required_level' => $evaluation['data']['required_level'],
            'complexity' => $evaluation['data']['complexity'],
            'title' => $evaluation['data']['title'] ?? null,
            'description' => $evaluation['data']['description'] ?? null,
        ];
    }
}
