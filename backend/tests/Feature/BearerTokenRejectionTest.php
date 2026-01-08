<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * SECURITY TEST: Bearer Token Rejection
 * 
 * Verifies that:
 * 1. Bearer tokens are explicitly rejected with 401
 * 2. Session-based (cookie) auth works correctly
 * 
 * This enforces the "Sanctum stateful cookie authentication ONLY" policy.
 */
class BearerTokenRejectionTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->user = User::factory()->create([
            'email_verified_at' => now(),
            'role' => 'student',
        ]);
    }

    /**
     * Test: Request with Bearer token returns 401
     */
    public function test_bearer_token_returns_401(): void
    {
        // Create a token for the user
        $token = $this->user->createToken('test-token')->plainTextToken;

        // Make request with Bearer token in header
        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
            'Accept' => 'application/json',
        ])->getJson('/api/auth/me');

        // Should be rejected with 401
        $response->assertStatus(401);
        $response->assertJson([
            'message' => 'Bearer token authentication is not supported. Use session-based authentication.',
            'error' => 'unauthorized_auth_method',
        ]);
    }

    /**
     * Test: Session-based auth (Sanctum cookie) works correctly
     */
    public function test_sanctum_session_auth_returns_200(): void
    {
        // Use Sanctum's actingAs helper which simulates session auth
        Sanctum::actingAs($this->user);

        $response = $this->getJson('/api/auth/me');

        // Should succeed with session auth
        $response->assertStatus(200);
        $response->assertJsonPath('id', $this->user->id);
        $response->assertJsonPath('email', $this->user->email);
    }

    /**
     * Test: Bearer token with lowercase 'bearer' also rejected
     */
    public function test_lowercase_bearer_token_returns_401(): void
    {
        $token = $this->user->createToken('test-token')->plainTextToken;

        $response = $this->withHeaders([
            'Authorization' => 'bearer ' . $token,
            'Accept' => 'application/json',
        ])->getJson('/api/auth/me');

        $response->assertStatus(401);
    }

    /**
     * Test: Bearer token on protected student endpoint
     */
    public function test_bearer_token_on_student_endpoint_returns_401(): void
    {
        $token = $this->user->createToken('test-token')->plainTextToken;

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
            'Accept' => 'application/json',
        ])->getJson('/api/student/roadmap');

        $response->assertStatus(401);
    }

    /**
     * Test: Same student endpoint with session auth works
     */
    public function test_session_auth_on_student_endpoint_returns_200(): void
    {
        Sanctum::actingAs($this->user);

        $response = $this->getJson('/api/student/roadmap');

        // Should succeed (may be empty data, but not 401)
        $this->assertNotEquals(401, $response->status());
    }

    /**
     * Test: Bearer token on business endpoint (with business user)
     */
    public function test_bearer_token_on_business_endpoint_returns_401(): void
    {
        $businessUser = User::factory()->create([
            'email_verified_at' => now(),
            'role' => 'business',
        ]);

        $token = $businessUser->createToken('test-token')->plainTextToken;

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
            'Accept' => 'application/json',
        ])->getJson('/api/business/projects');

        $response->assertStatus(401);
    }

    /**
     * Test: Bearer token on admin endpoint (with admin user)
     */
    public function test_bearer_token_on_admin_endpoint_returns_401(): void
    {
        $adminUser = User::factory()->create([
            'email_verified_at' => now(),
            'role' => 'admin',
        ]);

        $token = $adminUser->createToken('test-token')->plainTextToken;

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
            'Accept' => 'application/json',
        ])->getJson('/api/admin/users');

        $response->assertStatus(401);
    }

    /**
     * Test: Public endpoints still work without auth
     */
    public function test_public_health_endpoint_works(): void
    {
        $response = $this->getJson('/api/health');

        $response->assertStatus(200);
        $response->assertJson(['status' => 'ok']);
    }

    /**
     * Test: Public endpoints with Bearer token still reject
     */
    public function test_bearer_on_public_endpoint_still_rejected(): void
    {
        $token = $this->user->createToken('test-token')->plainTextToken;

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
            'Accept' => 'application/json',
        ])->getJson('/api/health');

        // Even public endpoints should reject Bearer tokens
        // This ensures consistent security posture
        $response->assertStatus(401);
    }
}
