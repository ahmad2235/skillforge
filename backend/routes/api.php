<?php

use Illuminate\Support\Facades\Route;

Route::get('/health', function () {
    return response()->json(['status' => 'ok']);
});

// هنا سنحمّل جميع مسارات موديول Identity
require base_path('app/Modules/Identity/Interface/routes.php');
