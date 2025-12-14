<?php

use Illuminate\Support\Facades\Route;

Route::get('/health', function () {
    return response()->json(['status' => 'ok']);
});

// هنا سنحمّل جميع مسارات موديول Identity
require base_path('app/Modules/Identity/Interface/routes.php');
require base_path('app/Modules/Learning/Interface/routes.php');
require base_path('app/Modules/Projects/Interface/routes.php');
require base_path('app/Modules/Gamification/Interface/routes.php');
// Assessment module routes
require base_path('app/Modules/Assessment/Interface/routes.php');

// Versioned alias (/api/v1/*) keeps backward compatibility while enabling clients to migrate
Route::prefix('v1')->group(function () {
    require base_path('app/Modules/Identity/Interface/routes.php');
    require base_path('app/Modules/Learning/Interface/routes.php');
    require base_path('app/Modules/Projects/Interface/routes.php');
    require base_path('app/Modules/Gamification/Interface/routes.php');
    require base_path('app/Modules/Assessment/Interface/routes.php');
});