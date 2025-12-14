<?php

use Illuminate\Support\Facades\Route;
use App\Modules\Learning\Interface\Http\Controllers\StudentRoadmapController;
use App\Modules\Learning\Interface\Http\Controllers\TaskController;
use App\Modules\Learning\Interface\Http\Controllers\AdminRoadmapBlockController;
use App\Modules\Learning\Interface\Http\Controllers\AdminTaskController;

// =======================
// Student routes
// =======================
Route::middleware(['auth:sanctum', 'role:student'])
    ->prefix('student')
    ->group(function () {
        Route::get('/roadmap', [StudentRoadmapController::class, 'index']);

        Route::post('/blocks/{block}/start', [StudentRoadmapController::class, 'startBlock']);
        Route::post('/blocks/{block}/complete', [StudentRoadmapController::class, 'completeBlock']);

        Route::get('/blocks/{block}/tasks', [TaskController::class, 'listByBlock']);
        Route::post('/tasks/{task}/submit', [TaskController::class, 'submit']);
        Route::get('/submissions/{submission}', [TaskController::class, 'getSubmission']);
    });

// =======================
// Admin routes
// =======================
Route::middleware(['auth:sanctum', 'role:admin'])
    ->prefix('admin/learning')
    ->group(function () {
        // Blocks
        Route::get('/blocks',            [AdminRoadmapBlockController::class, 'index']);
        Route::post('/blocks',           [AdminRoadmapBlockController::class, 'store']);
        Route::get('/blocks/{block}',    [AdminRoadmapBlockController::class, 'show']);
        Route::put('/blocks/{block}',    [AdminRoadmapBlockController::class, 'update']);
        Route::delete('/blocks/{block}', [AdminRoadmapBlockController::class, 'destroy']);

        // Tasks under block
        Route::get('/blocks/{block}/tasks',  [AdminTaskController::class, 'index']);
        Route::post('/blocks/{block}/tasks', [AdminTaskController::class, 'store']);

        // Edit/delete task directly
        Route::put('/tasks/{task}',    [AdminTaskController::class, 'update']);
        Route::delete('/tasks/{task}', [AdminTaskController::class, 'destroy']);
    });
