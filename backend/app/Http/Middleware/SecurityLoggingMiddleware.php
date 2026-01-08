<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * SECURITY MIDDLEWARE: Log All Security Events
 * 
 * PURPOSE: Centralized logging for security-relevant events.
 * 
 * LOGS:
 * - Authorization failures (403)
 * - Authentication failures (401)
 * - Rate limit hits (429)
 * - Validation failures (422) for sensitive endpoints
 * 
 * LOG STRUCTURE:
 * - event_type: Type of security event
 * - ip: Client IP address
 * - user_id: Authenticated user ID (if available)
 * - endpoint: Requested endpoint
 * - method: HTTP method
 * - timestamp: ISO 8601 timestamp
 * - details: Additional context
 */
class SecurityLoggingMiddleware
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
        $response = $next($request);

        $statusCode = $response->getStatusCode();

        // Log security-relevant response codes
        if (in_array($statusCode, [401, 403, 429])) {
            $this->logSecurityEvent($request, $response, $statusCode);
        }

        return $response;
    }

    /**
     * Log a security event.
     */
    private function logSecurityEvent(Request $request, $response, int $statusCode): void
    {
        $eventTypes = [
            401 => 'auth_failure',
            403 => 'authorization_failure',
            429 => 'rate_limit_hit',
        ];

        $logData = [
            'event_type' => $eventTypes[$statusCode] ?? 'security_event',
            'status_code' => $statusCode,
            'ip' => $request->ip(),
            'user_id' => $request->user()?->id,
            'user_email' => $request->user()?->email,
            'endpoint' => $request->path(),
            'method' => $request->method(),
            'user_agent' => $request->userAgent(),
            'timestamp' => now()->toIso8601String(),
        ];

        // Add response message if available
        $content = $response->getContent();
        if ($content) {
            $decoded = json_decode($content, true);
            if (isset($decoded['message'])) {
                $logData['response_message'] = $decoded['message'];
            }
        }

        Log::channel('security')->warning('Security event', $logData);
    }
}
