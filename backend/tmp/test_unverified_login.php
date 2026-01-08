<?php

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

// Create a fake request
$req = Illuminate\Http\Request::create('/api/auth/login','POST',[
    'email' => 'verify_test@example.test',
    'password' => 'secret',
]);

$response = $kernel->handle($req);

echo "Status: " . $response->getStatusCode() . PHP_EOL;
echo (string) $response->getContent() . PHP_EOL;

$kernel->terminate($req, $response);
