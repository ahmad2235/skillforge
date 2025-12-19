<?php

return [
    'paths' => ['api/*'],
    'allowed_methods' => ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
    'allowed_origins' => [env('FRONTEND_URL', 'http://127.0.0.1:5173')],
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['Content-Type','X-Requested-With','Authorization','Accept','Origin'],
    'exposed_headers' => ['Authorization'],
    'max_age' => 3600,
    // Using Bearer tokens; credentials not required for API
    'supports_credentials' => false,
];
