<?php

namespace Tests\Feature\AI;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * Feature tests for the Project Leveler API
 * 
 * These tests mock the external project_leveler service.
 */
class ProjectLevelerTest extends TestCase
{
    use RefreshDatabase;

    private User $businessOwner;

    protected function setUp(): void
    {
        parent::setUp();

        $this->businessOwner = User::factory()->create([
            'role' => 'business',
            'email_verified_at' => now(),
        ]);
    }

    /**
     * Test analyze-pdf endpoint requires authentication
     */
    public function test_analyze_pdf_requires_auth(): void
    {
        $response = $this->postJson('/api/business/projects/analyze-pdf');

        $response->assertStatus(401);
    }

    /**
     * Test analyze-pdf requires PDF file
     */
    public function test_analyze_pdf_requires_file(): void
    {
        $this->actingAs($this->businessOwner);

        $response = $this->postJson('/api/business/projects/analyze-pdf');

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['pdf']);
    }

    /**
     * Test analyze-pdf rejects non-PDF files
     */
    public function test_analyze_pdf_rejects_non_pdf(): void
    {
        $this->actingAs($this->businessOwner);

        $file = UploadedFile::fake()->create('document.txt', 100);

        $response = $this->postJson('/api/business/projects/analyze-pdf', [
            'pdf' => $file,
        ]);

        $response->assertStatus(422);
    }

    /**
     * Test analyze-pdf returns success when service is available
     */
    public function test_analyze_pdf_returns_evaluation(): void
    {
        $this->actingAs($this->businessOwner);

        // Mock the external service response
        Http::fake([
            '*/evaluate-pdf' => Http::response([
                'success' => true,
                'data' => [
                    'domain' => 'backend',
                    'required_level' => 'intermediate',
                    'complexity' => 'medium',
                    'language_or_framework' => ['Laravel', 'MySQL'],
                    'estimates' => [
                        'pdf_pages' => 5,
                        'ui_pages' => ['min' => 5, 'max' => 10],
                        'db_tables' => ['min' => 8, 'max' => 12],
                        'db_size' => 'medium',
                    ],
                    'reasons' => [
                        'required_level' => 'Multiple modules with authentication.',
                        'complexity' => 'Standard CRUD with some integrations.',
                        'language_or_framework' => 'Based on requirements for API development.',
                    ],
                ],
            ], 200),
        ]);

        // Create a fake PDF with proper PDF header signature
        // Laravel's mimes validation checks file content, not just extension
        $pdfContent = "%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\ntrailer\n<<\n/Root 1 0 R\n>>\n%%EOF";
        $file = UploadedFile::fake()->createWithContent('project.pdf', $pdfContent);

        $response = $this->postJson('/api/business/projects/analyze-pdf', [
            'pdf' => $file,
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'data' => [
                'domain' => 'backend',
                'required_level' => 'intermediate',
                'complexity' => 'medium',
            ],
            'suggested_fields' => [
                'domain' => 'backend',
                'required_level' => 'intermediate',
                'complexity' => 'medium',
            ],
        ]);
    }

    /**
     * Test leveler-health endpoint
     */
    public function test_leveler_health_endpoint(): void
    {
        $this->actingAs($this->businessOwner);

        // Mock healthy service
        Http::fake([
            '*/health' => Http::response(['status' => 'ok'], 200),
        ]);

        $response = $this->getJson('/api/business/projects/leveler-health');

        $response->assertStatus(200);
        $response->assertJson([
            'available' => true,
            'service' => 'project_leveler',
        ]);
    }

    /**
     * Test leveler-health when service is down
     */
    public function test_leveler_health_when_unavailable(): void
    {
        $this->actingAs($this->businessOwner);

        // Mock failed service
        Http::fake([
            '*/health' => Http::response(null, 500),
        ]);

        $response = $this->getJson('/api/business/projects/leveler-health');

        $response->assertStatus(503);
        $response->assertJson([
            'available' => false,
        ]);
    }

    /**
     * Test student cannot access leveler endpoints
     */
    public function test_student_cannot_access_leveler(): void
    {
        $student = User::factory()->create([
            'role' => 'student',
            'email_verified_at' => now(),
        ]);

        $this->actingAs($student);

        $response = $this->getJson('/api/business/projects/leveler-health');

        $response->assertStatus(403);
    }
}
