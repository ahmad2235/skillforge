<?php

use Illuminate\Support\Facades\Route;
use App\Modules\Identity\Interface\Http\Controllers\AuthController;

/*
 | ------------------------------------------------------------------
 | Identity Module Routes (Auth)
 | ------------------------------------------------------------------
 | كل المسارات الخاصة بالتسجيل / تسجيل الدخول / الخروج
 | رح تكون تحت /api/auth/...
 */

Route::prefix('auth')->group(function () {
    // POST /api/auth/register
    Route::post('register', [AuthController::class, 'register']);

    // POST /api/auth/login
    Route::post('login', [AuthController::class, 'login']);

    // هذه المسارات تحتاج أن يكون المستخدم مسجّل دخول (token)
    Route::middleware('auth:sanctum')->group(function () {
        // GET /api/auth/me
        Route::get('me', [AuthController::class, 'me']);

        // POST /api/auth/logout
        Route::post('logout', [AuthController::class, 'logout']);
    });
});
