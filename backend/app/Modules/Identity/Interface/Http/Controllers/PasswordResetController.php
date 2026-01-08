<?php

namespace App\Modules\Identity\Interface\Http\Controllers;

use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Mail;
use App\Mail\PasswordResetMail;

class PasswordResetController extends Controller
{
    /**
     * Request password reset link
     * POST /api/auth/forgot-password
     */
    public function forgotPassword(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|email',
        ]);

        $email = strtolower(trim($validated['email']));
        Log::info('Password reset requested', ['email' => $email]);

        $user = User::where('email', $email)->first();

        // Always return success message for security (don't reveal if email exists)
        if (!$user) {
            Log::warning('Password reset requested for non-existent email', ['email' => $email]);

            $payload = [
                'message' => 'If an account exists with this email, you will receive a password reset link shortly.',
            ];

            // In local/dev environment include a non-sensitive debug flag to help developers
            if (app()->environment('local')) {
                $payload['account_exists'] = false;
            }

            return response()->json($payload);
        }

        try {
            // Delete any existing tokens for this email
            DB::table('password_reset_tokens')->where('email', $email)->delete();
            Log::debug('Deleted existing password reset tokens', ['email' => $email]);

            // Generate a secure random token
            $token = Str::random(64);
            $hashedToken = Hash::make($token);

            // Store the token
            DB::table('password_reset_tokens')->insert([
                'email' => $email,
                'token' => $hashedToken,
                'created_at' => now(),
            ]);
            Log::info('Password reset token stored', ['email' => $email, 'token_hash' => substr($hashedToken, 0, 20) . '...']);

            // Send email with reset link
            try {
                Log::info('Sending password reset email', ['email' => $email, 'user' => $user->name]);
                Mail::to($user->email)->send(new PasswordResetMail($user, $token));
                Log::info('Password reset email sent successfully', ['email' => $email, 'mail_driver' => config('mail.default')]);
            } catch (\Exception $e) {
                Log::error('Failed to send password reset email', [
                    'email' => $email,
                    'exception' => get_class($e),
                    'message' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                ]);
                // Still return success to avoid revealing account existence
            }
        } catch (\Exception $e) {
            Log::error('Unexpected error in password reset flow', [
                'email' => $email,
                'exception' => get_class($e),
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
        }

        $payload = [
            'message' => 'If an account exists with this email, you will receive a password reset link shortly.',
        ];

        if (app()->environment('local')) {
            $payload['account_exists'] = true;
        }

        return response()->json($payload);
    }

    /**
     * Reset password with token
     * POST /api/auth/reset-password
     */
    public function resetPassword(Request $request)
    {
        $validated = $request->validate([
            'token' => 'required|string',
            'email' => 'required|email',
            'password' => 'required|min:8|confirmed',
        ]);

        // Find the reset token
        $resetRecord = DB::table('password_reset_tokens')
            ->where('email', $validated['email'])
            ->first();

        if (!$resetRecord) {
            return response()->json([
                'message' => 'Invalid or expired reset token.',
            ], 422);
        }

        // Check if token matches
        if (!Hash::check($validated['token'], $resetRecord->token)) {
            return response()->json([
                'message' => 'Invalid or expired reset token.',
            ], 422);
        }

        // Check if token is expired (1 hour)
        $createdAt = \Carbon\Carbon::parse($resetRecord->created_at);
        if ($createdAt->addHour()->isPast()) {
            DB::table('password_reset_tokens')->where('email', $validated['email'])->delete();
            return response()->json([
                'message' => 'Reset token has expired. Please request a new one.',
            ], 422);
        }

        // Find user and update password
        $user = User::where('email', $validated['email'])->first();

        if (!$user) {
            return response()->json([
                'message' => 'User not found.',
            ], 404);
        }

        // Update password
        $user->password = Hash::make($validated['password']);
        $user->save();

        // Delete the used token
        DB::table('password_reset_tokens')->where('email', $validated['email'])->delete();

        // Revoke all existing tokens for security
        $user->tokens()->delete();

        return response()->json([
            'message' => 'Password reset successfully. You can now log in with your new password.',
        ]);
    }
}
