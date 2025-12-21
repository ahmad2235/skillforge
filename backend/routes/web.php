<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// Minimal named login route to satisfy auth middleware when redirecting
// and to return a clear JSON response for API clients.
Route::get('/login', function () {
    return response()->json(['message' => 'Authentication required'], 401);
})->name('login');
