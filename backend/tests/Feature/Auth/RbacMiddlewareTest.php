<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RbacMiddlewareTest extends TestCase
{
    use RefreshDatabase;

    public function test_student_endpoints_reject_non_student_roles(): void
    {
        $admin = User::factory()->admin()->create();

        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/student/roadmap');

        $response->assertStatus(403);
    }

    public function test_admin_endpoints_reject_non_admin_roles(): void
    {
        $student = User::factory()->student()->create();

        Sanctum::actingAs($student);

        $response = $this->getJson('/api/admin/monitoring/overview');

        $response->assertStatus(403);
    }

    public function test_admin_endpoints_reject_business_roles(): void
    {
        $business = User::factory()->business()->create();

        Sanctum::actingAs($business);

        $response = $this->getJson('/api/admin/monitoring/overview');

        $response->assertStatus(403);
    }
}
