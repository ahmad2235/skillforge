<?php

return [
    'paths' => ['api/*'],
    'allowed_methods' => ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
    // Allow common local dev origins (Vite may use 5173 or try another port like 5174)
    'allowed_origins' => [
        env('FRONTEND_URL', 'http://127.0.0.1:5173'),
        'http://127.0.0.1:5174',
        'http://localhost:5173',
        'http://localhost:5174',
    ],
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['Content-Type','X-Requested-With','Authorization','Accept','Origin'],
    'exposed_headers' => ['Authorization'],
    'max_age' => 3600,
    // Using Bearer tokens; credentials not required for API
    'supports_credentials' => false,
];
