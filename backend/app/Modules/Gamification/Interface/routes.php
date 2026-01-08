<?php
use App\Modules\Gamification\Interface\Http\Controllers\StudentPortfolioController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'role:student'])
    ->prefix('student')
    ->group(function () {
        // قائمة البورتفوليو للطالب
        Route::get('/portfolios', [StudentPortfolioController::class, 'index']);
        
        // الحصول على معلومات مستوى الطالب
        Route::get('/portfolios/info/level', [StudentPortfolioController::class, 'getLevelInfo']);

        // إنشاء portfolio جديد (ad-hoc)
        Route::post('/portfolios', [StudentPortfolioController::class, 'store']);

        // الحصول على portfolio محدد
        Route::get('/portfolios/{id}', [StudentPortfolioController::class, 'show']);

        // تحديث portfolio
        Route::put('/portfolios/{id}', [StudentPortfolioController::class, 'update']);

        // حذف portfolio
        Route::delete('/portfolios/{id}', [StudentPortfolioController::class, 'destroy']);

        // تبديل visibility
        Route::patch('/portfolios/{id}/visibility', [StudentPortfolioController::class, 'toggleVisibility']);

        // تصدير portfolio item كـ PDF
        Route::get('/portfolios/{id}/export-pdf', [StudentPortfolioController::class, 'exportPdf']);

        // تصدير عدة portfolios كـ PDF
        Route::post('/portfolios/export-pdf/multiple', [StudentPortfolioController::class, 'exportMultiplePdf']);

        // إنشاء portfolio من مشروع business مكتمل
        Route::post('/projects/assignments/{assignment}/portfolio', [StudentPortfolioController::class, 'storeFromAssignment']);
    });

