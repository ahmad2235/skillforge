<?php

namespace App\Modules\Identity\Interface\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Register a new user and return token.
     */
    public function register(Request $request)
    {
        // 1) Validation: نتأكد من صحة البيانات
        $data = $request->validate([
            'name'     => 'required|string|max:100',
            'email'    => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
        ]);

        // 2) إنشاء المستخدم في قاعدة البيانات
        $user = User::create([
            'name'     => $data['name'],
            'email'    => $data['email'],
            'password' => Hash::make($data['password']),
        ]);

        // 3) إنشاء توكن للمستخدم عبر Sanctum
        $token = $user->createToken('auth_token')->plainTextToken;

        // 4) نرجع user + token كـ JSON
        return response()->json([
            'user'  => $user,
            'token' => $token,
        ], 201);
    }

    /**
     * Login user and return new token.
     */
    public function login(Request $request)
    {
        // 1) Validation
        $data = $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        // 2) البحث عن المستخدم
        $user = User::where('email', $data['email'])->first();

        // 3) التحقق من صحة كلمة المرور
        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        // 4) (اختياري) حذف التوكنات القديمة
        $user->tokens()->delete();

        // 5) إنشاء توكن جديد
        $token = $user->createToken('auth_token')->plainTextToken;

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
