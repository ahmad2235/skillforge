<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Suppress PHP 8.5 deprecation warnings for PDO constants
        // These warnings corrupt JSON API responses
        error_reporting(E_ALL & ~E_DEPRECATED);

        // Rate limiters
        RateLimiter::for('login', function (Request $request) {
            $key = strtolower((string) $request->input('email')).'|'.$request->ip();
            return [
                Limit::perMinute(5)->by($key),
                Limit::perMinute(20)->by($request->ip()),
            ];
        });

        RateLimiter::for('register', function (Request $request) {
            return [
                Limit::perMinute(3)->by($request->ip()),
            ];
        });

        // Sensitive endpoints: submissions
        RateLimiter::for('submissions', function (Request $request) {
            $userKey = optional($request->user())->id ?: $request->ip();
            return [
                Limit::perMinute(10)->by($userKey),
            ];
        });

        // Sensitive endpoints: assignments
        RateLimiter::for('assignments', function (Request $request) {
            $userKey = optional($request->user())->id ?: $request->ip();
            return [
                Limit::perMinute(30)->by($userKey),
            ];
        });

        // Sensitive endpoints: placement submit
        RateLimiter::for('placement_submit', function (Request $request) {
            $userKey = optional($request->user())->id ?: $request->ip();
            return [
                Limit::perMinute(5)->by($userKey),
            ];
        });
    }
}
