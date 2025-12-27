<?php

use Illuminate\Support\Facades\Route;
use App\Modules\Identity\Interface\Http\Controllers\AuthController;
use App\Modules\Identity\Interface\Http\Controllers\EmailVerificationController;
use App\Modules\Identity\Interface\Http\Controllers\AdminMonitoringController;
use App\Modules\Identity\Interface\Http\Controllers\AdminUserController;

/*
 | ------------------------------------------------------------------
 | Identity Module Routes (Auth)
 | ------------------------------------------------------------------
 | كل المسارات الخاصة بالتسجيل / تسجيل الدخول / الخروج
 | رح تكون تحت /api/auth/...
 */

Route::prefix('auth')->group(function () {
    // POST /api/auth/register (rate limited)
    Route::post('register', [AuthController::class, 'register'])
        ->middleware('throttle:register');

    // POST /api/auth/login (rate limited)
    Route::post('login', [AuthController::class, 'login'])
        ->middleware('throttle:login');

    // Email verification - PUBLIC route secured by signed URL
    // The signed middleware validates the cryptographic signature (no auth token needed)
    // GET /api/auth/email/verify/{id}/{hash}
    Route::get('email/verify/{id}/{hash}', [EmailVerificationController::class, 'verify'])
        ->middleware(['signed', 'throttle:6,1'])
        ->name('verification.verify');

    // هذه المسارات تحتاج أن يكون المستخدم مسجّل دخول (token)
    Route::middleware('auth:sanctum')->group(function () {
        // GET /api/auth/me
        Route::get('me', [AuthController::class, 'me']);

        // POST /api/auth/logout
        Route::post('logout', [AuthController::class, 'logout']);

        // Resend verification email - requires auth (user must be logged in)
        // POST /api/auth/email/resend
        Route::post('email/resend', [EmailVerificationController::class, 'resend'])
            ->middleware('throttle:6,1')
            ->name('verification.send');
    });
});

/*
 | ------------------------------------------------------------------
 | Admin Monitoring Routes
 | ------------------------------------------------------------------
 */
Route::middleware(['auth:sanctum', 'role:admin', 'throttle:30,1'])
    ->prefix('admin/monitoring')
    ->group(function () {
        Route::get('/overview', [AdminMonitoringController::class, 'overview']);
        Route::get('/users/recent', [AdminMonitoringController::class, 'recentUsers']);
        Route::get('/users/by-role', [AdminMonitoringController::class, 'usersByRole']);
        Route::get('/students/by-level', [AdminMonitoringController::class, 'studentsByLevel']);
        Route::get('/students/by-domain', [AdminMonitoringController::class, 'studentsByDomain']);
        Route::get('/submissions/recent', [AdminMonitoringController::class, 'recentSubmissions']);
        Route::get('/ai-logs/recent', [AdminMonitoringController::class, 'recentAiLogs']);
        Route::get('/assignments/recent', [AdminMonitoringController::class, 'recentAssignments']);
    });

// Admin users management (index/show/update)
Route::middleware(['auth:sanctum', 'role:admin', 'throttle:30,1'])
    ->prefix('admin')
    ->group(function () {
        Route::get('/users', [AdminUserController::class, 'index']);
        Route::get('/users/{user}', [AdminUserController::class, 'show']);
        Route::patch('/users/{user}', [AdminUserController::class, 'update']);

        // Students listing (admin)
        Route::get('/students', [\App\Modules\Identity\Interface\Http\Controllers\AdminStudentController::class, 'index']);
    });
