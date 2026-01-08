<?php

/**
 * QA TEST DATA CREATOR
 * 
 * Run: php artisan tinker < qa_create_users.php
 */

require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\User;
use Illuminate\Support\Facades\Hash;

// Delete old test users
User::where('email', 'like', 'qa-test-%')->forceDelete();

// Create User A (Student)
$userA = User::create([
    'name' => 'QA Test Student',
    'email' => 'qa-test-student-' . time() . '@skillforge.dev',
    'password' => Hash::make('password123'),
    'role' => 'student',
    'email_verified_at' => now(),
    'is_active' => true,
]);
$tokenA = $userA->createToken('qa-token')->plainTextToken;

// Create User B (Business)
$userB = User::create([
    'name' => 'QA Test Business',
    'email' => 'qa-test-business-' . time() . '@skillforge.dev',
    'password' => Hash::make('password123'),
    'role' => 'business',
    'email_verified_at' => now(),
    'is_active' => true,
]);
$tokenB = $userB->createToken('qa-token')->plainTextToken;

// Create User C (Admin)
$userC = User::create([
    'name' => 'QA Test Admin',
    'email' => 'qa-test-admin-' . time() . '@skillforge.dev',
    'password' => Hash::make('password123'),
    'role' => 'admin',
    'email_verified_at' => now(),
    'is_active' => true,
]);
$tokenC = $userC->createToken('qa-token')->plainTextToken;

// Output in easy-to-copy format
$output = <<<EOT
================== QA TEST USERS CREATED ==================

USER A (STUDENT)
User ID: {$userA->id}
Email: {$userA->email}
Password: password123
Role: student
Token: {$tokenA}

USER B (BUSINESS)
User ID: {$userB->id}
Email: {$userB->email}
Password: password123
Role: business
Token: {$tokenB}

USER C (ADMIN)
User ID: {$userC->id}
Email: {$userC->email}
Password: password123
Role: admin
Token: {$tokenC}

===========================================================
EOT;

echo $output;
file_put_contents('QA_TEST_DATA.txt', $output);
echo "\nData saved to QA_TEST_DATA.txt\n";
