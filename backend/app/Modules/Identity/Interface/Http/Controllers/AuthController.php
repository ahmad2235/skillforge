<?php

namespace App\Modules\Identity\Interface\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use App\Modules\Identity\Interface\Http\Requests\RegisterRequest;
use App\Modules\Identity\Interface\Http\Requests\LoginRequest;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Illuminate\Contracts\Auth\StatefulGuard;

class AuthController extends Controller
{
    /**
     * Register a new user and send verification email.
     * NO TOKEN is issued until email is verified.
     */
    public function register(RegisterRequest $request)
    {
        // 1) Validation via FormRequest (strict allow-list)
        $data = $request->validated();

        // 2) Create user in database
        $user = User::create([
            'name'     => $data['name'],
            'email'    => $data['email'],
            'password' => Hash::make($data['password']),
        ]);

        // 3) Send email verification notification
        $user->sendEmailVerificationNotification();

        // Security logging (without PII)
        Log::info('auth.register_success', [
            'user_id' => $user->id,
            'ip'      => $request->ip(),
        ]);

        // 4) Return success message WITHOUT token
        return response()->json([
            'message' => 'Registration successful. Please check your email to verify your account.',
            'email'   => $user->email,
        ], 201);
    }

    /**
     * Login user and return new token.
     * Requires email verification.
     * 
     * @var StatefulGuard $guard
     */
    public function login(LoginRequest $request)
    {
        // 1) Validation via FormRequest
        $data = $request->validated();

        // 2) Find user
        $user = User::where('email', $data['email'])->first();

        // 3) Check password
        if (! $user || ! Hash::check($data['password'], $user->password)) {
            // Log security event - failed login
            Log::channel('security')->warning('Login failed - invalid credentials', [
                'email_hash' => hash('sha256', strtolower($data['email'])),
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'timestamp' => now()->toIso8601String(),
            ]);
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        // 4) Check email verification
        if (is_null($user->email_verified_at)) {
            // Log security event - unverified login attempt
            Log::channel('security')->warning('Login attempt for unverified email', [
                'user_id' => $user->id,
                'email_hash' => hash('sha256', strtolower($user->email)),
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'timestamp' => now()->toIso8601String(),
            ]);

            // Attempt to send verification email to reduce friction (catch errors)
            try {
                $user->sendEmailVerificationNotification();
                Log::channel('security')->info('Verification email sent on unverified login attempt', [
                    'user_id' => $user->id,
                    'user_email' => $user->email,
                    'ip' => $request->ip(),
                    'timestamp' => now()->toIso8601String(),
                ]);
            } catch (\Throwable $e) {
                Log::channel('security')->error('Failed to send verification email on login attempt', [
                    'user_id' => $user->id,
                    'error' => $e->getMessage(),
                ]);
            }

            return response()->json([
                'message' => 'Please verify your email before logging in. A verification link has been sent to your email.',
            ], 403);
        }

        // Establish a session for SPA (stateful cookie auth)
        // Regenerate session to prevent fixation and login the user via session guard
        /** @var StatefulGuard $guard */
        $guard = auth();
        $guard->login($user);
        if ($request->hasSession()) {
            $request->session()->regenerate();
        }

        // Clean up any old API tokens (if any) for security
        $user->tokens()->delete();

        // Log successful login
        Log::channel('security')->info('Login successful', [
            'user_id' => $user->id,
            'ip' => $request->ip(),
            'timestamp' => now()->toIso8601String(),
        ]);

        // Return user only (no bearer token) - SPA uses cookie-based auth
        return response()->json([
            'user' => $user,
        ]);
    }

    /**
     * Return current authenticated user.
     */
    public function me(Request $request)
    {
        return response()->json($request->user());
    }

    /**
     * Logout current user (invalidate session).
     * 
     * @var StatefulGuard $guard
     */
    public function logout(Request $request)
    {
        /** @var StatefulGuard $guard */
        $guard = auth();

        // Safely delete current access token if one exists (Sanctum)
        /** @var \App\Models\User|null $user */
        $user = $guard->user();
        if ($user && method_exists($user, 'currentAccessToken')) {
            /** @var \Laravel\Sanctum\PersonalAccessToken|null $token */
            $token = $user->currentAccessToken();
            if ($token) {
                $token->delete();
            }
        }

        // Log out from session guard
        if ($guard->check()) {
            $guard->logout();
        }

        // Invalidate the session and regenerate CSRF token (if session exists)
        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->json(['message' => 'Logged out']);
    }
}
