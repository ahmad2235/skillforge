<?php

use Illuminate\Support\Facades\Route;
use App\Modules\Projects\Interface\Http\Controllers\OwnerProjectController;
use App\Modules\Projects\Interface\Http\Controllers\OwnerProjectAssignmentController;
use App\Modules\Projects\Interface\Http\Controllers\StudentAssignmentController;
use App\Modules\Projects\Interface\Http\Controllers\OwnerProjectMilestoneController;
use App\Modules\Projects\Interface\Http\Controllers\StudentMilestoneController;
use App\Modules\Projects\Interface\Http\Controllers\AdminMilestoneSubmissionController;
use App\Modules\Projects\Interface\Http\Controllers\AdminProjectController;
use App\Modules\AI\Interface\Http\Controllers\ProjectLevelerController;


Route::middleware(['auth:sanctum', 'role:business'])
    ->prefix('business')
    ->group(function () {
        Route::get('/projects',                 [OwnerProjectController::class, 'index']);
        Route::post('/projects',                [OwnerProjectController::class, 'store']);
        
        // AI-powered routes - must be defined BEFORE {project} catch-all
        Route::post('/projects/analyze-pdf', [ProjectLevelerController::class, 'analyzePdf'])
            ->name('business.projects.analyze-pdf');
        Route::get('/projects/leveler-health', [ProjectLevelerController::class, 'health'])
            ->name('business.projects.leveler-health');
        
        Route::get('/projects/{project}',       [OwnerProjectController::class, 'show']);
        Route::put('/projects/{project}',       [OwnerProjectController::class, 'update']);
        Route::post('/projects/{project}/status', [OwnerProjectController::class, 'changeStatus']);
        Route::delete('/projects/{project}',    [OwnerProjectController::class, 'destroy']);
        Route::get('/projects/{project}/candidates',  [OwnerProjectAssignmentController::class, 'candidates']);
        Route::get('/projects/{project}/assignments', [OwnerProjectAssignmentController::class, 'index'])
            ->middleware('throttle:assignments');
        Route::post('/projects/{project}/assignments', [OwnerProjectAssignmentController::class, 'invite'])
            ->middleware('throttle:assignments');
        Route::delete('/projects/assignments/{assignment}/cancel', [OwnerProjectAssignmentController::class, 'cancelInvitation'])
            ->middleware('throttle:assignments');
        Route::delete('/projects/assignments/{assignment}', [OwnerProjectAssignmentController::class, 'destroy'])
            ->middleware('throttle:assignments');
        Route::get('/projects/assignments/{assignment}/submissions', [OwnerProjectAssignmentController::class, 'submissions']);
        Route::post('/projects/submissions/{submission}/review', [OwnerProjectAssignmentController::class, 'reviewSubmission']);
        Route::post('/projects/assignments/{assignment}/complete', [OwnerProjectAssignmentController::class, 'completeWithFeedback']);

        Route::get('/projects/{project}/milestones', [OwnerProjectMilestoneController::class, 'index']);
        Route::post('/projects/{project}/milestones', [OwnerProjectMilestoneController::class, 'store']);
        Route::put('/projects/{project}/milestones/{milestone}', [OwnerProjectMilestoneController::class, 'update']);
        Route::delete('/projects/{project}/milestones/{milestone}', [OwnerProjectMilestoneController::class, 'destroy']);

    });

    Route::middleware(['auth:sanctum', 'role:student'])
    ->prefix('student/projects')
    ->group(function () {
        Route::get('/assignments', [StudentAssignmentController::class, 'index']);
        Route::post('/assignments/{assignment}/accept', [StudentAssignmentController::class, 'accept']);
        Route::post('/assignments/{assignment}/decline', [StudentAssignmentController::class, 'decline']);
        Route::post('/assignments/{assignment}/feedback', [StudentAssignmentController::class, 'feedback']);

        Route::get('/assignments/{assignment}/milestones', [StudentMilestoneController::class, 'index']);
        Route::post('/assignments/{assignment}/milestones/{milestone}/submit', [StudentMilestoneController::class, 'submit'])
            ->middleware('throttle:submissions');

    });

Route::middleware(['auth:sanctum', 'role:admin'])
    ->prefix('admin/projects')
    ->group(function () {
        Route::get('/', [AdminProjectController::class, 'index']);
        Route::put('/{project}', [AdminProjectController::class, 'update']);
        Route::delete('/{project}', [AdminProjectController::class, 'destroy']);
        Route::get('/milestone-submissions', [AdminMilestoneSubmissionController::class, 'index']);
        Route::post('/milestone-submissions/{submission}/review', [AdminMilestoneSubmissionController::class, 'review']);
    });
