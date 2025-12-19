<?php

namespace App\Exceptions;

use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Illuminate\Validation\ValidationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Auth\Access\AuthorizationException;
use Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException;
use Throwable;
use Illuminate\Support\Facades\Log;

class Handler extends ExceptionHandler
{
    protected $dontReport = [
        // Avoid logging sensitive exceptions too verbosely
        ValidationException::class,
        AuthorizationException::class,
        AuthenticationException::class,
        TooManyRequestsHttpException::class,
    ];

    public function register(): void
    {
        //
    }

    public function render($request, Throwable $e)
    {
        if ($request->expectsJson()) {
            if ($e instanceof ValidationException) {
                return response()->json([
                    'message' => 'The given data was invalid.',
                    'errors'  => $e->errors(),
                ], 422);
            }

            if ($e instanceof AuthenticationException) {
                return response()->json(['message' => 'Unauthenticated'], 401);
            }

            if ($e instanceof AuthorizationException) {
                Log::warning('auth.forbidden_attempt', [
                    'ip' => $request->ip(),
                    'path' => $request->path(),
                ]);
                return response()->json(['message' => 'Forbidden'], 403);
            }

            if ($e instanceof TooManyRequestsHttpException) {
                Log::warning('rate_limit_triggered', [
                    'ip' => $request->ip(),
                    'path' => $request->path(),
                ]);
                return response()->json(['message' => 'Too Many Requests'], 429);
            }

            // Generic error without stack trace
            return response()->json([
                'message' => 'Server error',
            ], 500);
        }

        return parent::render($request, $e);
    }
}
