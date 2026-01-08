<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;
use App\Models\User;
use App\Modules\Learning\Application\Services\RoadmapService;

$user = User::find(11);
if (!$user) {
    echo "User 11 not found\n";
    exit(1);
}

/** @var RoadmapService $svc */
$svc = $app->make(RoadmapService::class);
$blocks = $svc->getStudentRoadmap($user);

echo "Roadmap blocks for user 11:\n";
foreach ($blocks as $b) {
    echo "- {$b['id']} - {$b['title']} ({$b['status']})\n";
}

if ($blocks->isEmpty()) echo "(empty)\n";
