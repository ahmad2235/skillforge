<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';

use App\Modules\Identity\Interface\Http\Controllers\AuthController;
use Illuminate\Http\Request;

$req = Request::create('/api/auth/login','POST',[
    'email' => 'verify_test@example.test',
    'password' => 'secret',
]);

// Convert to LoginRequest to satisfy type-hinting
$loginRequest = App\Modules\Identity\Interface\Http\Requests\LoginRequest::createFromBase($req);
$loginRequest->setContainer($app);
$loginRequest->setRedirector($app->make('redirect'));

$controller = new AuthController();
$response = $controller->login($loginRequest);

echo 'Status: ' . $response->getStatusCode() . PHP_EOL;
echo (string) $response->getContent() . PHP_EOL;
