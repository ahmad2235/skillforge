<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
->withRouting(
    web: __DIR__.'/../routes/web.php',
    api: __DIR__.'/../routes/api.php',
    commands: __DIR__.'/../routes/console.php',
    health: '/up',
)

->withMiddleware(function (Middleware $middleware) {
    $middleware->statefulApi([
        'localhost',
        '127.0.0.1',
        'backend.test'
    ])
    ->validateCsrfTokens();

    $middleware->api(prepend: [
        \App\Http\Middleware\SecurityHeadersMiddleware::class,
    ]);

    // -------------------------
    // ADD ROLE MIDDLEWARE ALIAS
    // -------------------------
    $middleware->alias([
        'role' => \App\Http\Middleware\RoleMiddleware::class,
    ]);
})


    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
