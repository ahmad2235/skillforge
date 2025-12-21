<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class UsersTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_list_users_with_pagination_and_filters()
    {
        $admin = User::factory()->create(['role' => 'admin']);

        // Create users with a known name for search
        User::factory()->create(['name' => 'FindMe User', 'email' => 'findme@example.com', 'role' => 'student', 'is_active' => true]);
        User::factory()->count(25)->create(['role' => 'student']);

        Sanctum::actingAs($admin, ['*']);

        $resp = $this->getJson('/api/admin/users?per_page=10');
        $resp->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    ['id', 'name', 'email', 'role', 'is_active', 'created_at']
                ],
                'meta' => ['current_page', 'last_page', 'per_page', 'total']
            ]);

        $this->assertCount(10, $resp->json('data'));

        // Search by q
        $resp2 = $this->getJson('/api/admin/users?q=FindMe');
        $resp2->assertStatus(200);
        $this->assertGreaterThanOrEqual(1, count($resp2->json('data')));
    }

    public function test_admin_can_view_user_details()
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $user = User::factory()->create(['name' => 'Detail User', 'email' => 'detail@example.com']);

        Sanctum::actingAs($admin, ['*']);

        $resp = $this->getJson("/api/admin/users/{$user->id}");
        $resp->assertStatus(200)
            ->assertJsonFragment(['id' => $user->id, 'email' => 'detail@example.com']);
    }

    public function test_non_admin_cannot_access_users()
    {
        $user = User::factory()->create(['role' => 'student']);
        Sanctum::actingAs($user, ['*']);

        $resp = $this->getJson('/api/admin/users');
        $resp->assertStatus(403);
    }

    public function test_admin_can_update_user_is_active()
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $user = User::factory()->create(['is_active' => true]);

        Sanctum::actingAs($admin, ['*']);

        $resp = $this->patchJson("/api/admin/users/{$user->id}", ['is_active' => false]);
        $resp->assertStatus(200)
            ->assertJsonFragment(['id' => $user->id, 'is_active' => false]);

        $this->assertDatabaseHas('users', ['id' => $user->id, 'is_active' => 0]);
    }
}
