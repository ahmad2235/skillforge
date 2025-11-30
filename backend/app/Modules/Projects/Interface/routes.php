<?php

use Illuminate\Support\Facades\Route;
use App\Modules\Projects\Interface\Http\Controllers\OwnerProjectController;
use App\Modules\Projects\Interface\Http\Controllers\OwnerProjectAssignmentController;
use App\Modules\Projects\Interface\Http\Controllers\StudentAssignmentController;


Route::middleware(['auth:sanctum', 'role:business'])
    ->prefix('business')
    ->group(function () {
        Route::get('/projects',                 [OwnerProjectController::class, 'index']);
        Route::post('/projects',                [OwnerProjectController::class, 'store']);
        Route::get('/projects/{project}',       [OwnerProjectController::class, 'show']);
        Route::put('/projects/{project}',       [OwnerProjectController::class, 'update']);
        Route::post('/projects/{project}/status', [OwnerProjectController::class, 'changeStatus']);
        Route::delete('/projects/{project}',    [OwnerProjectController::class, 'destroy']);
        Route::get('/projects/{project}/candidates',  [OwnerProjectAssignmentController::class, 'candidates']);
        Route::get('/projects/{project}/assignments', [OwnerProjectAssignmentController::class, 'index']);
        Route::post('/projects/{project}/assignments', [OwnerProjectAssignmentController::class, 'invite']);
        Route::post('/projects/assignments/{assignment}/complete', [OwnerProjectAssignmentController::class, 'completeWithFeedback']);

    });

    Route::middleware(['auth:sanctum', 'role:student'])
    ->prefix('student/projects')
    ->group(function () {
        Route::get('/assignments', [StudentAssignmentController::class, 'index']);
        Route::post('/assignments/{assignment}/accept', [StudentAssignmentController::class, 'accept']);
        Route::post('/assignments/{assignment}/decline', [StudentAssignmentController::class, 'decline']);
        Route::post('/assignments/{assignment}/feedback', [StudentAssignmentController::class, 'feedback']);

    });
