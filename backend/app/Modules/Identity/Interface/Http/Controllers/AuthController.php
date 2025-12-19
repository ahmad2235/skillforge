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
     * Register a new user and return token.
     */
    public function register(RegisterRequest $request)
    {
        // 1) Validation via FormRequest (strict allow-list)
        $data = $request->validated();

        // 2) إنشاء المستخدم في قاعدة البيانات
        $user = User::create([
            'name'     => $data['name'],
            'email'    => $data['email'],
            'password' => Hash::make($data['password']),
        ]);

        // 3) إنشاء توكن للمستخدم عبر Sanctum
        $token = $user->createToken('auth_token')->plainTextToken;

        // Security logging (without PII)
        Log::info('auth.register_success', [
            'user_id' => $user->id,
            'ip'      => $request->ip(),
        ]);

        // 4) نرجع user + token كـ JSON
        return response()->json([
            'user'  => $user,
            'token' => $token,
        ], 201);
    }

    /**
     * Login user and return new token.
     */
    public function login(LoginRequest $request)
    {
        // 1) Validation via FormRequest
        $data = $request->validated();

        // 2) البحث عن المستخدم
        $user = User::where('email', $data['email'])->first();

        // 3) التحقق من صحة كلمة المرور
        if (! $user || ! Hash::check($data['password'], $user->password)) {
            Log::warning('auth.login_failed', [
                'email_hash' => hash('sha256', strtolower($data['email'])),
                'ip'         => $request->ip(),
            ]);
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        // 4) (اختياري) حذف التوكنات القديمة
        $user->tokens()->delete();

        // 5) إنشاء توكن جديد
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
