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
     *
     * No auth token required - the signed URL IS the authentication.
     */
    public function verify(Request $request, int $id, string $hash)
    {
        // Find the user by ID
        $user = User::find($id);

        if (!$user) {
            return response()->json([
                'message' => 'User not found.',
            ], 404);
        }

        // Verify the hash matches sha1 of user's email
        if (!hash_equals($hash, sha1($user->getEmailForVerification()))) {
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

        Log::info('auth.email_verified', [
            'user_id' => $user->id,
            'ip'      => $request->ip(),
        ]);

        return response()->json([
            'message' => 'Email verified successfully. You can now login.',
        ], 200);
    }

    /**
     * Resend verification email.
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

        Log::info('auth.verification_email_resent', [
            'user_id' => $request->user()->id,
            'ip'      => $request->ip(),
        ]);

        return response()->json([
            'message' => 'Verification email sent. Please check your inbox.',
        ], 200);
    }
}
