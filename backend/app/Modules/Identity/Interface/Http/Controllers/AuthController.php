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
     */
    public function login(LoginRequest $request)
    {
        // 1) Validation via FormRequest
        $data = $request->validated();

        // 2) Find user
        $user = User::where('email', $data['email'])->first();

        // 3) Check password
        if (! $user || ! Hash::check($data['password'], $user->password)) {
            Log::warning('auth.login_failed', [
                'email_hash' => hash('sha256', strtolower($data['email'])),
                'ip'         => $request->ip(),
            ]);
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        // 4) Check email verification
        if (is_null($user->email_verified_at)) {
            Log::warning('auth.login_unverified', [
                'user_id' => $user->id,
                'ip'      => $request->ip(),
            ]);
            return response()->json([
                'message' => 'Please verify your email before logging in.',
            ], 403);
        }

        // 5) Delete old tokens
        $user->tokens()->delete();

        // 6) Create new token
        $token = $user->createToken('auth_token')->plainTextToken;

        Log::info('auth.login_success', [
            'user_id' => $user->id,
            'ip'      => $request->ip(),
        ]);

        return response()->json([
            'user'  => $user,
            'token' => $token,
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
     * Logout current token.
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out']);
    }
}
