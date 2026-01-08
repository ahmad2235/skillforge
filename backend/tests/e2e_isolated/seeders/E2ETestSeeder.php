<?php
/**
 * E2E Isolated Test Seeder
 * Created: 2025-12-29
 * Purpose: Seeds multiple unique test users for each role to support concurrent VU testing
 */

namespace Tests\E2EIsolated\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class E2ETestSeeder extends Seeder
{
    /**
     * Number of test users per role for concurrent VU testing
     */
    private const STUDENTS_COUNT = 15;
    private const BUSINESS_COUNT = 5;
    private const ADMIN_COUNT = 3;

    /**
     * Run the database seeds for E2E testing
     */
    public function run(): void
    {
        $this->command->info('[E2E] Starting E2E Test User Seeding...');
        
        // Seed Student Users (15 unique users for 10 VUs + buffer)
        $this->seedStudents();
        
        // Seed Business Users
        $this->seedBusinessUsers();
        
        // Seed Admin Users
        $this->seedAdminUsers();
        
        $this->command->info('[E2E] E2E Test User Seeding Complete!');
    }

    /**
     * Seed student test users with varied levels and domains
     */
    private function seedStudents(): void
    {
        $levels = ['beginner', 'intermediate', 'advanced'];
        $domains = ['frontend', 'backend'];
        
        for ($i = 1; $i <= self::STUDENTS_COUNT; $i++) {
            User::updateOrCreate(
                ['email' => "e2e_student_{$i}@test.local"],
                [
                    'name' => "E2E Student {$i}",
                    'password' => Hash::make('e2e_test_pass_123'),
                    'role' => 'student',
                    'level' => $levels[($i - 1) % count($levels)],
                    'domain' => $domains[($i - 1) % count($domains)],
                    'email_verified_at' => now(),
                ]
            );
        }
        
        $this->command->info("[E2E] Seeded " . self::STUDENTS_COUNT . " student users");
    }

    /**
     * Seed business test users
     */
    private function seedBusinessUsers(): void
    {
        for ($i = 1; $i <= self::BUSINESS_COUNT; $i++) {
            User::updateOrCreate(
                ['email' => "e2e_business_{$i}@test.local"],
                [
                    'name' => "E2E Business {$i}",
                    'password' => Hash::make('e2e_test_pass_123'),
                    'role' => 'business',
                    'email_verified_at' => now(),
                ]
            );
        }
        
        $this->command->info("[E2E] Seeded " . self::BUSINESS_COUNT . " business users");
    }

    /**
     * Seed admin test users
     */
    private function seedAdminUsers(): void
    {
        for ($i = 1; $i <= self::ADMIN_COUNT; $i++) {
            User::updateOrCreate(
                ['email' => "e2e_admin_{$i}@test.local"],
                [
                    'name' => "E2E Admin {$i}",
                    'password' => Hash::make('e2e_test_pass_123'),
                    'role' => 'admin',
                    'email_verified_at' => now(),
                ]
            );
        }
        
        $this->command->info("[E2E] Seeded " . self::ADMIN_COUNT . " admin users");
    }
}
