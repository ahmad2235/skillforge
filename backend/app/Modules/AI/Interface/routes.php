<?php

/**
 * AI Module Routes
 * 
 * This file defines routes for AI-powered features.
 * 
 * Note: Business owner routes for analyze-pdf and leveler-health 
 * are defined in Projects module routes to ensure correct route ordering.
 * 
 * All routes require authentication and appropriate role permissions.
 */

use Illuminate\Support\Facades\Route;
use App\Modules\AI\Interface\Http\Controllers\ProjectLevelerController;

/*
|--------------------------------------------------------------------------
| Business AI Routes (Public to authenticated business owners)
|--------------------------------------------------------------------------
*/
Route::middleware(['auth:sanctum', 'role:business'])
    ->prefix('ai')
    ->group(function () {
        Route::post('/analyze-pdf', [ProjectLevelerController::class, 'analyzePdf'])
            ->name('ai.analyze-pdf');
        Route::get('/leveler-health', [ProjectLevelerController::class, 'health'])
            ->name('ai.leveler-health');
    });

/*
|--------------------------------------------------------------------------
| Admin AI Routes
|--------------------------------------------------------------------------
|
| Routes for admins to manage AI services.
|
*/
Route::middleware(['auth:sanctum', 'role:admin'])
    ->prefix('admin/ai')
    ->group(function () {
        // Admin can also check leveler health
        Route::get('/leveler-health', [ProjectLevelerController::class, 'health'])
            ->name('admin.ai.leveler-health');
    });
