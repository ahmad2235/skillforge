<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StudentsTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_list_students_with_pagination_and_filters()
    {
        $admin = User::factory()->create(['role' => 'admin']);

        // Create some students and non-students
        User::factory()->count(8)->create(['role' => 'student']);
        User::factory()->count(3)->create(['role' => 'business']);

        Sanctum::actingAs($admin, ['*']);

        $resp = $this->getJson('/api/admin/students?per_page=5');
        $resp->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    ['id', 'name', 'email', 'level', 'domain', 'is_active', 'created_at']
                ],
                'meta' => ['current_page', 'last_page', 'per_page', 'total']
            ]);

        $this->assertEquals(5, count($resp->json('data')));
        $this->assertEquals(8, $resp->json('meta.total'));

        // Search by email or name
        $specific = User::factory()->create(['role' => 'student', 'name' => 'Special Student', 'email' => 'special@example.com']);
        $resp2 = $this->getJson('/api/admin/students?search=Special');
        $resp2->assertStatus(200);
        $this->assertGreaterThanOrEqual(1, count($resp2->json('data')));
    }

    public function test_non_admin_cannot_access_students()
    {
        $user = User::factory()->create(['role' => 'student']);
        Sanctum::actingAs($user, ['*']);

        $resp = $this->getJson('/api/admin/students');
        $resp->assertStatus(403);
    }
}
