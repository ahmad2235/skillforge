<?php

namespace App\Modules\Identity\Interface\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class EmailVerificationController extends Controller
{
    /**
     * Verify email address.
     *
     * This route is PUBLIC but secured by:
     * 1. Signed URL middleware (validates cryptographic signature)
     * 2. URL expiration (signature includes timestamp)
     * 3. Hash verification (sha1 of user email)
     * 4. Rate limiting per IP (throttle:5,10 - 5 requests per 10 minutes)
     *
     * No auth token required - the signed URL IS the authentication.
     */
    public function verify(Request $request, int $id, string $hash)
    {
        // Find the user by ID
        $user = User::find($id);

        if (!$user) {
            // Log security event - user not found
            Log::channel('security')->warning('Email verification failed - user not found', [
                'attempted_user_id' => $id,
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'timestamp' => now()->toIso8601String(),
            ]);

            return response()->json([
                'message' => 'User not found.',
            ], 404);
        }

        // Verify the hash matches sha1 of user's email
        if (!hash_equals($hash, sha1($user->getEmailForVerification()))) {
            // Log security event - invalid hash
            Log::channel('security')->warning('Email verification failed - invalid hash', [
                'user_id' => $user->id,
                'user_email' => $user->email,
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'timestamp' => now()->toIso8601String(),
            ]);

            return response()->json([
                'message' => 'Invalid verification link.',
            ], 403);
        }

        // Check if already verified
        if ($user->hasVerifiedEmail()) {
            return response()->json([
                'message' => 'Email already verified.',
            ], 200);
        }

        // Mark email as verified
        if ($user->markEmailAsVerified()) {
            event(new Verified($user));
        }

        // Log success
        Log::channel('security')->info('Email verified successfully', [
            'user_id' => $user->id,
            'user_email' => $user->email,
            'ip' => $request->ip(),
            'timestamp' => now()->toIso8601String(),
        ]);

        return response()->json([
            'message' => 'Email verified successfully. You can now login.',
        ], 200);
    }

    /**
     * Resend verification email.
     * 
     * Rate limited: 5 requests per 10 minutes per IP.
     */
    public function resend(Request $request)
    {
        // Check if already verified
        if ($request->user()->hasVerifiedEmail()) {
            return response()->json([
                'message' => 'Email already verified.',
            ], 200);
        }

        // Send verification notification
        $request->user()->sendEmailVerificationNotification();

        // Log security event
        Log::channel('security')->info('Verification email resent', [
            'user_id' => $request->user()->id,
            'user_email' => $request->user()->email,
            'ip' => $request->ip(),
            'timestamp' => now()->toIso8601String(),
        ]);

        return response()->json([
            'message' => 'Verification email sent. Please check your inbox.',
        ], 200);
    }
}
