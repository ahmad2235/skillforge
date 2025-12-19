<?php

use Illuminate\Support\Facades\Route;
use App\Modules\Assessment\Application\Controllers\PlacementController;
use App\Modules\Assessment\Interface\Http\Controllers\AdminAssessmentController;

Route::middleware(['auth:sanctum', 'role:student'])
    ->prefix('student/assessment')
    ->group(function () {
        Route::get('/placement/questions', [PlacementController::class, 'getQuestions']);
        Route::post('/placement/submit', [PlacementController::class, 'submit'])
            ->middleware('throttle:placement_submit');
    });

// Admin routes
Route::middleware(['auth:sanctum', 'role:admin'])
    ->prefix('admin/assessment')
    ->group(function () {
        Route::get('/questions',     [AdminAssessmentController::class, 'index']);
        Route::post('/questions',    [AdminAssessmentController::class, 'store']);
        Route::get('/questions/{id}', [AdminAssessmentController::class, 'show']);
        Route::put('/questions/{id}', [AdminAssessmentController::class, 'update']);
        Route::delete('/questions/{id}', [AdminAssessmentController::class, 'destroy']);
    });
