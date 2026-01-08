<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * SECURITY MIDDLEWARE: Reject Bearer Token Authentication
 * 
 * PURPOSE: Enforce Sanctum stateful cookie authentication ONLY.
 * 
 * WHY THIS EXISTS:
 * - SkillForge uses Sanctum SPA authentication (session/cookie)
 * - Bearer tokens are NOT supported and must be explicitly rejected
 * - This prevents token-based auth bypass attempts
 * 
 * SECURITY LOGGING:
 * - All Bearer token attempts are logged for security audit
 * - Logs include IP, timestamp, and attempted endpoint
 * 
 * @see https://laravel.com/docs/sanctum#spa-authentication
 */
class RejectBearerTokenMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @return mixed
     */
    public function handle(Request $request, Closure $next)
    {
        $authHeader = $request->header('Authorization');

        // Check if request contains Bearer token
        if ($authHeader && str_starts_with(strtolower($authHeader), 'bearer ')) {
            // Log security event
            Log::channel('security')->warning('Bearer token rejected', [
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'endpoint' => $request->path(),
                'method' => $request->method(),
                'timestamp' => now()->toIso8601String(),
            ]);

            return response()->json([
                'message' => 'Bearer token authentication is not supported. Use session-based authentication.',
                'error' => 'unauthorized_auth_method',
            ], 401);
        }

        return $next($request);
    }
}
