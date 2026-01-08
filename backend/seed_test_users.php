#!/usr/bin/env php
<?php

/**
 * TEST DATA SEEDING SCRIPT
 * 
 * Creates test users for QA validation:
 * - User A: Student
 * - User B: Business Owner
 * - User C: Admin
 * 
 * Outputs Sanctum Bearer tokens for API testing
 */

require __DIR__ . '/vendor/autoload.php';
require __DIR__ . '/bootstrap/app.php';

use App\Models\User;
use Illuminate\Support\Facades\Hash;

// Clear existing test users
User::where('email', 'like', 'qa-test-%')->forceDelete();

echo "[SEEDING] Creating test users...\n";

// User A: Student
$userA = User::create([
    'name' => 'QA Test Student',
    'email' => 'qa-test-student@skillforge.dev',
    'password' => Hash::make('password123'),
    'role' => 'student',
    'email_verified_at' => now(),
    'is_active' => true,
]);

$tokenA = $userA->createToken('qa-test-token')->plainTextToken;

echo "\n=== USER A (STUDENT) ===\n";
echo "ID: {$userA->id}\n";
echo "Email: {$userA->email}\n";
echo "Role: {$userA->role}\n";
echo "Token: {$tokenA}\n";
echo "Active: {$userA->is_active}\n";

// User B: Business Owner
$userB = User::create([
    'name' => 'QA Test Business',
    'email' => 'qa-test-business@skillforge.dev',
    'password' => Hash::make('password123'),
    'role' => 'business',
    'email_verified_at' => now(),
    'is_active' => true,
]);

$tokenB = $userB->createToken('qa-test-token')->plainTextToken;

echo "\n=== USER B (BUSINESS) ===\n";
echo "ID: {$userB->id}\n";
echo "Email: {$userB->email}\n";
echo "Role: {$userB->role}\n";
echo "Token: {$tokenB}\n";
echo "Active: {$userB->is_active}\n";

// User C: Admin
$userC = User::create([
    'name' => 'QA Test Admin',
    'email' => 'qa-test-admin@skillforge.dev',
    'password' => Hash::make('password123'),
    'role' => 'admin',
    'email_verified_at' => now(),
    'is_active' => true,
]);

$tokenC = $userC->createToken('qa-test-token')->plainTextToken;

echo "\n=== USER C (ADMIN) ===\n";
echo "ID: {$userC->id}\n";
echo "Email: {$userC->email}\n";
echo "Role: {$userC->role}\n";
echo "Token: {$tokenC}\n";
echo "Active: {$userC->is_active}\n";

echo "\n[SEEDING] Complete!\n";
