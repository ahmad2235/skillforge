<?php

namespace Tests\Feature\Projects;

use App\Models\User;
use App\Modules\Projects\Infrastructure\Models\Project;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProjectPdfIntegrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
    }

    /**
     * Test business can create project without PDF (manual fields)
     */
    public function test_business_can_create_project_without_pdf(): void
    {
        $business = User::factory()->business()->create();
        Sanctum::actingAs($business);

        $response = $this->postJson('/api/business/projects', [
            'title' => 'Test Project',
            'description' => 'A simple project',
            'domain' => 'backend',
            'required_level' => 'intermediate',
            'complexity' => 'medium',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.title', 'Test Project')
            ->assertJsonPath('data.complexity', 'medium');

        $this->assertDatabaseHas('projects', [
            'title' => 'Test Project',
            'domain' => 'backend',
            'complexity' => 'medium',
        ]);
    }

    /**
     * Test business can create project with PDF and leveler auto-suggests fields
     */
    public function test_business_can_create_project_with_pdf_and_leveler(): void
    {
        $business = User::factory()->business()->create();
        Sanctum::actingAs($business);

        // Mock leveler service response
        Http::fake([
            '*/evaluate-pdf' => Http::response([
                'success' => true,
                'data' => [
                    'domain' => 'backend',
                    'required_level' => 'advanced',
                    'complexity' => 'high',
                    'language_or_framework' => ['Laravel', 'MySQL'],
                    'estimates' => [
                        'pdf_pages' => 3,
                        'ui_pages' => ['min' => 2, 'max' => 5],
                        'db_tables' => ['min' => 5, 'max' => 10],
                        'db_size' => 'medium',
                    ],
                    'reasons' => [
                        'required_level' => 'Complex architecture',
                        'complexity' => 'Multiple integrations',
                        'language_or_framework' => 'Based on tech stack',
                    ],
                ],
            ], 200),
        ]);

        // Create a proper PDF file for validation
        $pdfContent = "%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\ntrailer\n<<\n/Root 1 0 R\n>>\n%%EOF";
        $file = UploadedFile::fake()->createWithContent('requirements.pdf', $pdfContent);

        $response = $this->postJson('/api/business/projects', [
            'title' => 'PDF-based Project',
            'description' => 'Project from PDF',
            'requirements_pdf' => $file,
        ]);

        $response->assertStatus(201);

        $project = Project::where('title', 'PDF-based Project')->first();
        $this->assertNotNull($project);
        $this->assertEquals('backend', $project->domain);
        $this->assertEquals('advanced', $project->required_level);
        $this->assertEquals('high', $project->complexity);
        $this->assertNotNull($project->requirements_pdf_path);
        $this->assertArrayHasKey('leveler', $project->metadata);

        // Verify PDF was stored
        Storage::disk('public')->assertExists($project->requirements_pdf_path);
    }

    /**
     * Test manual fields override leveler suggestions
     */
    public function test_manual_fields_override_leveler_suggestions(): void
    {
        $business = User::factory()->business()->create();
        Sanctum::actingAs($business);

        // Mock leveler suggesting 'advanced'
        Http::fake([
            '*/evaluate-pdf' => Http::response([
                'success' => true,
                'data' => [
                    'domain' => 'backend',
                    'required_level' => 'advanced',
                    'complexity' => 'high',
                ],
            ], 200),
        ]);

        $pdfContent = "%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\ntrailer\n<<\n/Root 1 0 R\n>>\n%%EOF";
        $file = UploadedFile::fake()->createWithContent('requirements.pdf', $pdfContent);

        // But user explicitly sets 'beginner'
        $response = $this->postJson('/api/business/projects', [
            'title' => 'Override Test',
            'description' => 'Manual override',
            'domain' => 'frontend',
            'required_level' => 'beginner',
            'complexity' => 'low',
            'requirements_pdf' => $file,
        ]);

        $response->assertStatus(201);

        $project = Project::where('title', 'Override Test')->first();
        // Manual fields should win
        $this->assertEquals('frontend', $project->domain);
        $this->assertEquals('beginner', $project->required_level);
        $this->assertEquals('low', $project->complexity);
    }

    /**
     * Test project update with PDF
     */
    public function test_business_can_update_project_with_new_pdf(): void
    {
        $business = User::factory()->business()->create();
        $project = Project::factory()->create([
            'owner_id' => $business->id,
            'domain' => 'frontend',
            'complexity' => 'low',
        ]);

        Sanctum::actingAs($business);

        Http::fake([
            '*/evaluate-pdf' => Http::response([
                'success' => true,
                'data' => [
                    'domain' => 'backend',
                    'required_level' => 'intermediate',
                    'complexity' => 'medium',
                ],
            ], 200),
        ]);

        $pdfContent = "%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\ntrailer\n<<\n/Root 1 0 R\n>>\n%%EOF";
        $file = UploadedFile::fake()->createWithContent('updated.pdf', $pdfContent);

        $response = $this->putJson("/api/business/projects/{$project->id}", [
            'requirements_pdf' => $file,
        ]);

        $response->assertStatus(200);

        $project->refresh();
        $this->assertEquals('backend', $project->domain);
        $this->assertEquals('medium', $project->complexity);
        $this->assertNotNull($project->requirements_pdf_path);
    }

    /**
     * Test leveler failure doesn't block project creation
     */
    public function test_leveler_failure_does_not_block_project_creation(): void
    {
        $business = User::factory()->business()->create();
        Sanctum::actingAs($business);

        // Mock leveler failure
        Http::fake([
            '*/evaluate-pdf' => Http::response(['success' => false, 'error' => 'Service unavailable'], 503),
        ]);

        $pdfContent = "%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\ntrailer\n<<\n/Root 1 0 R\n>>\n%%EOF";
        $file = UploadedFile::fake()->createWithContent('test.pdf', $pdfContent);

        // Provide manual fallback fields
        $response = $this->postJson('/api/business/projects', [
            'title' => 'Fallback Project',
            'description' => 'Uses manual fields on leveler failure',
            'domain' => 'backend',
            'required_level' => 'beginner',
            'complexity' => 'low',
            'requirements_pdf' => $file,
        ]);

        $response->assertStatus(201);

        $project = Project::where('title', 'Fallback Project')->first();
        $this->assertNotNull($project);
        $this->assertEquals('backend', $project->domain);
        $this->assertArrayHasKey('leveler_error', $project->metadata);
    }
}
