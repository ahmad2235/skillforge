<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Recommendation\ProjectCandidatesController;

Route::get('/projects/{projectId}/candidates', ProjectCandidatesController::class);
