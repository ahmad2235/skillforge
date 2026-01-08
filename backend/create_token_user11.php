<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;

$user = User::find(11);
if (!$user) {
    echo "User 11 not found\n";
    exit(1);
}
$token = $user->createToken('cli-test-token');
// token->plainTextToken is the string used in Authorization header
echo $token->plainTextToken . PHP_EOL;