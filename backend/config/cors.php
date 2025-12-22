<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
    // Allow common local dev origins (Vite may use 5173 or try another port like 5174)
    'allowed_origins' => [
        env('FRONTEND_URL', 'http://127.0.0.1:5173'),
        'http://127.0.0.1:5174',
        'http://localhost:5173',
        'http://localhost:5174',
    ],
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['Content-Type','X-Requested-With','Authorization','Accept','Origin','X-CSRF-TOKEN','X-XSRF-TOKEN'],
    'exposed_headers' => ['Authorization'],
    'max_age' => 3600,
    // SPA uses cookies for authentication; allow credentials
    'supports_credentials' => true,
];
