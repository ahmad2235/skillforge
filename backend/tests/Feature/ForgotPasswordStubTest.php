<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ForgotPasswordStubTest extends TestCase
{
    use RefreshDatabase;

    public function test_valid_email_returns_501_and_message()
    {
        $response = $this->postJson('/api/auth/forgot-password', [
            'email' => 'user@example.com',
        ]);

        $response->assertStatus(501)
            ->assertJson(['message' => 'Password reset is not available yet. Please contact the admin/support.']);
    }

    public function test_invalid_email_returns_422()
    {
        $response = $this->postJson('/api/auth/forgot-password', [
            'email' => 'not-an-email',
        ]);

        $response->assertStatus(422)
            ->assertJsonStructure(['message', 'errors' => ['email']]);
    }
}
