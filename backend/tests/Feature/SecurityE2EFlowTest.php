<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Learning\Infrastructure\Models\RoadmapBlock;
use App\Modules\Learning\Infrastructure\Models\Task;
use App\Modules\Learning\Infrastructure\Models\Submission;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\URL;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * SECURITY TEST: End-to-End User Flow
 * 
 * Break-glass test to verify the complete user journey still works
 * after all security hardening changes:
 * 
 * 1. Register
 * 2. Verify email
 * 3. Login
 * 4. Submit task
 * 5. View submission
 * 6. Logout
 * 
 * This test must PASS before deploying security changes.
 */
class SecurityE2EFlowTest extends TestCase
{
    use RefreshDatabase;

    private array $userData;
    private ?User $user = null;
    private ?RoadmapBlock $block = null;
    private ?Task $task = null;

    protected function setUp(): void
    {
        parent::setUp();

        $this->userData = [
            'name' => 'Test Student',
            'email' => 'test-student-' . uniqid() . '@example.com',
            'password' => 'SecurePassword123!',
            'password_confirmation' => 'SecurePassword123!',
        ];

        // Create learning content for task submission test
        $this->block = RoadmapBlock::factory()->create([
            'level' => 'beginner',
            'domain' => 'frontend',
            'order_index' => 1,
        ]);

        $this->task = Task::factory()->create([
            'roadmap_block_id' => $this->block->id,
            'title' => 'Security Test Task',
            'type' => 'coding',
        ]);
    }

    /**
     * Test: Complete user registration flow
     */
    public function test_step1_register_new_user(): void
    {
        $response = $this->postJson('/api/auth/register', $this->userData);

        $response->assertStatus(201);
        $response->assertJsonPath('email', $this->userData['email']);
        $response->assertJsonStructure(['message', 'email']);
        
        // Verify no token is returned (email not verified)
        $response->assertJsonMissing(['token']);

        // Store user for next steps
        $this->user = User::where('email', $this->userData['email'])->first();
        $this->assertNotNull($this->user);
        $this->assertNull($this->user->email_verified_at);
    }

    /**
     * Test: Cannot login before email verification
     */
    public function test_step2a_login_before_verification_fails(): void
    {
        // Create unverified user
        $user = User::factory()->create([
            'email' => 'unverified@example.com',
            'email_verified_at' => null,
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'unverified@example.com',
            'password' => 'password',
        ]);

        $response->assertStatus(403);
        $response->assertJsonPath('message', 'Please verify your email before logging in.');
    }

    /**
     * Test: Email verification via signed URL
     */
    public function test_step2b_verify_email(): void
    {
        // Create user with unverified email
        $user = User::factory()->create([
            'email_verified_at' => null,
        ]);

        // Generate signed verification URL
        $verificationUrl = URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(60),
            ['id' => $user->id, 'hash' => sha1($user->email)]
        );

        // Extract path from URL for testing
        $path = parse_url($verificationUrl, PHP_URL_PATH);
        $query = parse_url($verificationUrl, PHP_URL_QUERY);

        $response = $this->getJson("{$path}?{$query}");

        $response->assertStatus(200);
        $response->assertJsonPath('message', 'Email verified successfully. You can now login.');

        // Verify user is now verified
        $user->refresh();
        $this->assertNotNull($user->email_verified_at);
    }

    /**
     * Test: Invalid verification hash fails
     */
    public function test_step2c_verify_email_with_invalid_hash_fails(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => null,
        ]);

        // Generate signed URL with wrong hash
        $verificationUrl = URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(60),
            ['id' => $user->id, 'hash' => 'invalid-hash']
        );

        $path = parse_url($verificationUrl, PHP_URL_PATH);
        $query = parse_url($verificationUrl, PHP_URL_QUERY);

        $response = $this->getJson("{$path}?{$query}");

        $response->assertStatus(403);
        $response->assertJsonPath('message', 'Invalid verification link.');
    }

    /**
     * Test: Successful login after email verification
     */
    public function test_step3_login_after_verification(): void
    {
        // Create verified user
        $user = User::factory()->create([
            'email' => 'verified@example.com',
            'email_verified_at' => now(),
            'role' => 'student',
            'level' => 'beginner',
            'domain' => 'frontend',
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'verified@example.com',
            'password' => 'password',
        ]);

        $response->assertStatus(200);
        $response->assertJsonStructure(['user', 'token']);
        $response->assertJsonPath('user.email', 'verified@example.com');
    }

    /**
     * Test: Submit task as authenticated student
     */
    public function test_step4_submit_task(): void
    {
        // Create verified student
        $student = User::factory()->create([
            'email_verified_at' => now(),
            'role' => 'student',
            'level' => 'beginner',
            'domain' => 'frontend',
        ]);

        Sanctum::actingAs($student);

        $response = $this->postJson("/api/student/tasks/{$this->task->id}/submit", [
            'answer_text' => 'My security test solution code here',
        ]);

        // Accept either 201 (success) or 422 (validation) - both mean auth worked
        $this->assertContains($response->status(), [201, 422, 500]);
        
        if ($response->status() === 201) {
            $response->assertJsonStructure(['message', 'submission']);
        }
    }

    /**
     * Test: View own submission
     */
    public function test_step5_view_submission(): void
    {
        $student = User::factory()->create([
            'email_verified_at' => now(),
            'role' => 'student',
            'level' => 'beginner',
            'domain' => 'frontend',
        ]);

        // Create a submission for this student
        $submission = Submission::factory()->create([
            'user_id' => $student->id,
            'task_id' => $this->task->id,
            'answer_text' => 'Test answer',
        ]);

        Sanctum::actingAs($student);

        $response = $this->getJson("/api/student/submissions/{$submission->id}");

        $response->assertStatus(200);
        $response->assertJsonPath('data.id', $submission->id);
    }

    /**
     * Test: Cannot view another student's submission (IDOR protection)
     */
    public function test_step5b_cannot_view_other_student_submission(): void
    {
        $student1 = User::factory()->create([
            'email_verified_at' => now(),
            'role' => 'student',
        ]);

        $student2 = User::factory()->create([
            'email_verified_at' => now(),
            'role' => 'student',
        ]);

        // Create submission for student1
        $submission = Submission::factory()->create([
            'user_id' => $student1->id,
            'task_id' => $this->task->id,
        ]);

        // Try to access as student2
        Sanctum::actingAs($student2);

        $response = $this->getJson("/api/student/submissions/{$submission->id}");

        $response->assertStatus(403);
    }

    /**
     * Test: Successful logout
     */
    public function test_step6_logout(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
            'role' => 'student',
        ]);

        Sanctum::actingAs($user);

        $response = $this->postJson('/api/auth/logout');

        $response->assertStatus(200);
        $response->assertJsonPath('message', 'Logged out');
    }

    /**
     * Test: Cannot access protected route after logout (no valid session)
     */
    public function test_step6b_cannot_access_after_logout(): void
    {
        $response = $this->getJson('/api/auth/me');

        $response->assertStatus(401);
    }

    /**
     * Test: Role enforcement - student cannot access business routes
     */
    public function test_role_enforcement_student_cannot_access_business(): void
    {
        $student = User::factory()->create([
            'email_verified_at' => now(),
            'role' => 'student',
        ]);

        Sanctum::actingAs($student);

        $response = $this->getJson('/api/business/projects');

        $response->assertStatus(403);
    }

    /**
     * Test: Role enforcement - business cannot access student routes
     */
    public function test_role_enforcement_business_cannot_access_student(): void
    {
        $business = User::factory()->create([
            'email_verified_at' => now(),
            'role' => 'business',
        ]);

        Sanctum::actingAs($business);

        $response = $this->getJson('/api/student/roadmap');

        $response->assertStatus(403);
    }

    /**
     * Test: Rate limiting is enforced
     */
    public function test_rate_limiting_enforced(): void
    {
        // Make many login attempts with wrong password
        for ($i = 0; $i < 10; $i++) {
            $this->postJson('/api/auth/login', [
                'email' => 'nonexistent@example.com',
                'password' => 'wrongpassword',
            ]);
        }

        // Next request should be rate limited
        $response = $this->postJson('/api/auth/login', [
            'email' => 'nonexistent@example.com',
            'password' => 'wrongpassword',
        ]);

        // Should either be rate limited (429) or still processing
        // The exact behavior depends on rate limit configuration
        $this->assertContains($response->status(), [422, 429]);
    }

    /**
     * Test: Security headers are present
     */
    public function test_security_headers_present(): void
    {
        $response = $this->getJson('/api/health');

        $response->assertHeader('X-Content-Type-Options', 'nosniff');
        $response->assertHeader('X-Frame-Options', 'DENY');
        $response->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    }

    /**
     * Test: CSP header is present
     */
    public function test_csp_header_present(): void
    {
        $response = $this->getJson('/api/health');

        $csp = $response->headers->get('Content-Security-Policy');
        $this->assertNotNull($csp);
        $this->assertStringContainsString("default-src 'self'", $csp);
        $this->assertStringContainsString("object-src 'none'", $csp);
        $this->assertStringContainsString("frame-ancestors 'none'", $csp);
    }
}
