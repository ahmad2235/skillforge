<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use App\Mail\PasswordResetMail;

class TestPasswordReset extends Command
{
    protected $signature = 'test:password-reset {email}';
    protected $description = 'Test password reset flow for a given email';

    public function handle()
    {
        $email = $this->argument('email');
        $this->info("Testing password reset for: {$email}");

        // Verify user exists
        $user = User::where('email', $email)->first();
        if (!$user) {
            $this->error("User not found: {$email}");
            return 1;
        }
        $this->info("✓ User found: {$user->name}");

        // Check config
        $frontendUrl = config('app.frontend_url');
        $mailDriver = config('mail.default');
        $mailFromAddress = config('mail.from.address');
        
        $this->info("Mail Configuration:");
        $this->line("  Frontend URL: {$frontendUrl}");
        $this->line("  Mail Driver: {$mailDriver}");
        $this->line("  From Address: {$mailFromAddress}");

        if (!$frontendUrl) {
            $this->error("✗ APP_FRONTEND_URL not configured in .env");
            return 1;
        }
        $this->info("✓ Frontend URL configured");

        // Generate token
        $token = Str::random(64);
        $hashedToken = Hash::make($token);
        
        $this->info("Token generated (first 20 chars): " . substr($token, 0, 20) . "...");

        // Delete existing tokens
        DB::table('password_reset_tokens')->where('email', $email)->delete();
        $this->info("✓ Cleared existing tokens");

        // Store token
        DB::table('password_reset_tokens')->insert([
            'email' => $email,
            'token' => $hashedToken,
            'created_at' => now(),
        ]);
        $this->info("✓ Token stored in database");

        // Build reset URL
        $resetUrl = rtrim($frontendUrl, '/') . '/auth/reset-password?token=' . urlencode($token) . '&email=' . urlencode($email);
        $this->info("Reset URL: {$resetUrl}");

        // Send email
        try {
            $this->info("Sending password reset email...");
            Mail::to($user->email)->send(new PasswordResetMail($user, $token));
            $this->info("✓ Email sent successfully via {$mailDriver} driver");
        } catch (\Exception $e) {
            $this->error("✗ Failed to send email: " . $e->getMessage());
            $this->line("Exception: " . get_class($e));
            return 1;
        }

        $this->info("\n✓ Password reset test completed successfully!");
        $this->info("Check the logs: storage/logs/laravel.log");

        return 0;
    }
}
