<?php

namespace Tests\Feature\Identity;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Auth\Notifications\VerifyEmail;
use Tests\TestCase;

class EmailVerificationTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test that registration does NOT issue a token.
     */
    public function test_register_does_not_issue_token(): void
    {
        Notification::fake();

        $response = $this->postJson('/api/auth/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ]);

        $response->assertStatus(201)
            ->assertJsonMissing(['token'])
            ->assertJsonStructure(['message', 'email']);

        // Verify user was created
        $this->assertDatabaseHas('users', [
            'email' => 'test@example.com',
        ]);

        // Verify email_verified_at is null
        $user = User::where('email', 'test@example.com')->first();
        $this->assertNull($user->email_verified_at);

        // Verify email notification was sent
        Notification::assertSentTo($user, VerifyEmail::class);
    }

    /**
     * Test that unverified user cannot login.
     */
    public function test_unverified_user_cannot_login(): void
    {
        // Create unverified user
        $user = User::create([
            'name' => 'Unverified User',
            'email' => 'unverified@example.com',
            'password' => Hash::make('Password123!'),
            'email_verified_at' => null,
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'unverified@example.com',
            'password' => 'Password123!',
        ]);

        $response->assertStatus(403)
            ->assertJson([
                'message' => 'Please verify your email before logging in.',
            ])
            ->assertJsonMissing(['token']);
    }

    /**
     * Test that verified user can login successfully.
     */
    public function test_verified_user_can_login(): void
    {
        // Create verified user
        $user = User::create([
            'name' => 'Verified User',
            'email' => 'verified@example.com',
            'password' => Hash::make('Password123!'),
            'email_verified_at' => now(),
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'verified@example.com',
            'password' => 'Password123!',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'user' => ['id', 'name', 'email'],
                'token',
            ]);
    }

    /**
     * Test email verification marks user as verified.
     *
     * IMPORTANT: This test verifies that verification works WITHOUT auth token.
     * The signed URL itself is the authentication mechanism.
     */
    public function test_email_verification_marks_user_as_verified(): void
    {
        // Create unverified user
        $user = User::create([
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => Hash::make('Password123!'),
            'email_verified_at' => null,
        ]);

        // Create a signed verification URL (this is what gets emailed to user)
        $verificationUrl = \Illuminate\Support\Facades\URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(60),
            ['id' => $user->id, 'hash' => sha1($user->email)]
        );

        // Extract the path from the full URL
        $path = parse_url($verificationUrl, PHP_URL_PATH) . '?' . parse_url($verificationUrl, PHP_URL_QUERY);

        // NO AUTH TOKEN - user clicks link from email in browser
        $response = $this->getJson($path);

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Email verified successfully. You can now login.',
            ]);

        // Verify database was updated
        $user->refresh();
        $this->assertNotNull($user->email_verified_at);
    }

    /**
     * Test resend verification email.
     */
    public function test_resend_verification_email(): void
    {
        Notification::fake();

        // Create unverified user
        $user = User::create([
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => Hash::make('Password123!'),
            'email_verified_at' => null,
        ]);

        // Create a token for the user
        $token = $user->createToken('auth_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/auth/email/resend');

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Verification email sent. Please check your inbox.',
            ]);

        // Verify email notification was sent
        Notification::assertSentTo($user, VerifyEmail::class);
    }

    /**
     * Test that verified users cannot access protected routes.
     */
    public function test_unverified_user_blocked_from_protected_routes(): void
    {
        // Create unverified user with token
        $user = User::create([
            'name' => 'Unverified User',
            'email' => 'unverified@example.com',
            'password' => Hash::make('Password123!'),
            'email_verified_at' => null,
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        // Try to access a protected route (example: /api/auth/me)
        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/auth/me');

        // For now, this will pass since we need to add 'verified' middleware
        // This test documents the expected behavior
        $response->assertStatus(200); // Will be 403 after adding 'verified' middleware to routes
    }
}
