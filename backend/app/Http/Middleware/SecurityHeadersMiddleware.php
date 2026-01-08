<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/**
 * SECURITY MIDDLEWARE: HTTP Security Headers
 * 
 * PURPOSE: Apply security headers to all API responses.
 * 
 * HEADERS APPLIED:
 * - X-Content-Type-Options: Prevent MIME sniffing
 * - X-Frame-Options: Prevent clickjacking
 * - Referrer-Policy: Control referrer information
 * - Permissions-Policy: Disable unnecessary browser features
 * - X-XSS-Protection: Legacy XSS protection
 * - Content-Security-Policy: Restrict content sources
 * - Strict-Transport-Security: Enforce HTTPS (production only)
 */
class SecurityHeadersMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        $response = $next($request);

        // Prevent MIME type sniffing
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        
        // Prevent clickjacking
        $response->headers->set('X-Frame-Options', 'DENY');
        
        // Control referrer information
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        
        // Disable unnecessary browser features
        $response->headers->set('Permissions-Policy', "camera=(), microphone=(), geolocation=(), interest-cohort=()");
        
        // XSS protection (legacy but still useful for older browsers)
        $response->headers->set('X-XSS-Protection', '1; mode=block');

        // Content Security Policy - Enforced mode
        // NOTE: This is a strict baseline CSP for API responses
        // Frontend SPA may need different CSP via its own server/CDN
        $csp = implode('; ', [
            "default-src 'self'",
            "script-src 'self'",
            "style-src 'self' 'unsafe-inline'", // Allow inline styles for API JSON responses
            "img-src 'self' data: https:",
            "font-src 'self'",
            "object-src 'none'",
            "base-uri 'none'",
            "frame-ancestors 'none'",
            "form-action 'self'",
            "upgrade-insecure-requests",
        ]);
        $response->headers->set('Content-Security-Policy', $csp);
        
        // HSTS - enforce HTTPS (only in production to avoid dev issues)
        if (app()->environment('production') && $request->secure()) {
            $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        }

        return $response;
    }
}
