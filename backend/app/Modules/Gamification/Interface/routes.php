<?php
use App\Modules\Gamification\Interface\Http\Controllers\StudentPortfolioController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'role:student'])
    ->prefix('student')
    ->group(function () {
        // قائمة البورتفوليو للطالب
        Route::get('/portfolios', [StudentPortfolioController::class, 'index']);

        // إنشاء portfolio من مشروع business مكتمل
        Route::post('/projects/assignments/{assignment}/portfolio', [StudentPortfolioController::class, 'storeFromAssignment']);
    });

