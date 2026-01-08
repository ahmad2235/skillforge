<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ForgotPasswordStubTest extends TestCase
{
    use RefreshDatabase;

    public function test_valid_email_sends_reset_link()
    {
        $user = User::factory()->create(['email' => 'user@example.com']);

        $response = $this->postJson('/api/auth/forgot-password', [
            'email' => 'user@example.com',
        ]);

        $response->assertStatus(200)
            ->assertJson(['message' => 'If an account exists with this email, you will receive a password reset link shortly.']);

        // Check token was created
        $this->assertDatabaseHas('password_reset_tokens', [
            'email' => 'user@example.com',
        ]);
    }

    public function test_nonexistent_email_still_returns_success()
    {
        // Security: don't reveal whether email exists
        $response = $this->postJson('/api/auth/forgot-password', [
            'email' => 'nonexistent@example.com',
        ]);

        $response->assertStatus(200)
            ->assertJson(['message' => 'If an account exists with this email, you will receive a password reset link shortly.']);

        // No token should be created
        $this->assertDatabaseMissing('password_reset_tokens', [
            'email' => 'nonexistent@example.com',
        ]);
    }

    public function test_invalid_email_returns_422()
    {
        $response = $this->postJson('/api/auth/forgot-password', [
            'email' => 'not-an-email',
        ]);

        $response->assertStatus(422)
            ->assertJsonStructure(['message', 'errors' => ['email']]);
    }

    public function test_reset_password_with_valid_token()
    {
        $user = User::factory()->create(['email' => 'user@example.com']);

        // Create a token
        $token = bin2hex(random_bytes(32));
        DB::table('password_reset_tokens')->insert([
            'email' => 'user@example.com',
            'token' => bcrypt($token),
            'created_at' => now(),
        ]);

        $response = $this->postJson('/api/auth/reset-password', [
            'token' => $token,
            'email' => 'user@example.com',
            'password' => 'newpassword123',
            'password_confirmation' => 'newpassword123',
        ]);

        $response->assertStatus(200)
            ->assertJson(['message' => 'Password reset successfully. You can now log in with your new password.']);

        // Verify user can log in with new password
        $loginResponse = $this->postJson('/api/auth/login', [
            'email' => 'user@example.com',
            'password' => 'newpassword123',
        ]);

        $loginResponse->assertStatus(200);
    }

    public function test_reset_password_with_expired_token()
    {
        $user = User::factory()->create(['email' => 'user@example.com']);

        // Create an expired token (> 1 hour)
        $token = bin2hex(random_bytes(32));
        DB::table('password_reset_tokens')->insert([
            'email' => 'user@example.com',
            'token' => bcrypt($token),
            'created_at' => now()->subHours(2),
        ]);

        $response = $this->postJson('/api/auth/reset-password', [
            'token' => $token,
            'email' => 'user@example.com',
            'password' => 'newpassword123',
            'password_confirmation' => 'newpassword123',
        ]);

        $response->assertStatus(422)
            ->assertJson(['message' => 'Reset token has expired. Please request a new one.']);
    }

    public function test_reset_password_with_invalid_token()
    {
        $user = User::factory()->create(['email' => 'user@example.com']);

        $response = $this->postJson('/api/auth/reset-password', [
            'token' => 'invalid-token',
            'email' => 'user@example.com',
            'password' => 'newpassword123',
            'password_confirmation' => 'newpassword123',
        ]);

        $response->assertStatus(422)
            ->assertJson(['message' => 'Invalid or expired reset token.']);
    }
}
