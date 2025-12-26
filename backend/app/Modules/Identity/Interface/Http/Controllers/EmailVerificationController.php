<?php

namespace App\Modules\Identity\Interface\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Auth\Events\Verified;
use Illuminate\Foundation\Auth\EmailVerificationRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class EmailVerificationController extends Controller
{
    /**
     * Verify email address.
     */
    public function verify(EmailVerificationRequest $request)
    {
        // Check if already verified
        if ($request->user()->hasVerifiedEmail()) {
            return response()->json([
                'message' => 'Email already verified.',
            ], 200);
        }

        // Mark email as verified
        if ($request->user()->markEmailAsVerified()) {
            event(new Verified($request->user()));
        }

        Log::info('auth.email_verified', [
            'user_id' => $request->user()->id,
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
