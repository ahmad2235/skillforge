<?php

use Illuminate\Support\Facades\Route;
use App\Modules\Assessment\Application\Controllers\PlacementController;

Route::middleware(['auth:sanctum', 'role:student'])
    ->prefix('student/assessment')
    ->group(function () {
        Route::get('/placement/questions', [PlacementController::class, 'getQuestions']);
        Route::post('/placement/submit', [PlacementController::class, 'submit']);
    });
