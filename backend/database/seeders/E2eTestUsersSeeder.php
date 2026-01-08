<?php
/**
 * ============================================================
 * E2E Isolated Test Users Seeder
 * Created: 2025-12-28
 * ============================================================
 * 
 * Seeds unique test users for E2E load testing.
 * Run with: php artisan db:seed --class=E2eTestUsersSeeder --env=e2e
 */

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;

class E2eTestUsersSeeder extends Seeder
{
    /**
     * E2E Test Users Configuration
     */
    private $testUsers = [
        // Students (12 users for 10 VUs with buffer)
        ['email' => 'e2e_student_01@test.local', 'name' => 'E2E Student 01', 'role' => 'student'],
        ['email' => 'e2e_student_02@test.local', 'name' => 'E2E Student 02', 'role' => 'student'],
        ['email' => 'e2e_student_03@test.local', 'name' => 'E2E Student 03', 'role' => 'student'],
        ['email' => 'e2e_student_04@test.local', 'name' => 'E2E Student 04', 'role' => 'student'],
        ['email' => 'e2e_student_05@test.local', 'name' => 'E2E Student 05', 'role' => 'student'],
        ['email' => 'e2e_student_06@test.local', 'name' => 'E2E Student 06', 'role' => 'student'],
        ['email' => 'e2e_student_07@test.local', 'name' => 'E2E Student 07', 'role' => 'student'],
        ['email' => 'e2e_student_08@test.local', 'name' => 'E2E Student 08', 'role' => 'student'],
        ['email' => 'e2e_student_09@test.local', 'name' => 'E2E Student 09', 'role' => 'student'],
        ['email' => 'e2e_student_10@test.local', 'name' => 'E2E Student 10', 'role' => 'student'],
        ['email' => 'e2e_student_11@test.local', 'name' => 'E2E Student 11', 'role' => 'student'],
        ['email' => 'e2e_student_12@test.local', 'name' => 'E2E Student 12', 'role' => 'student'],
        
        // Business users (5 users)
        ['email' => 'e2e_business_01@test.local', 'name' => 'E2E Business 01', 'role' => 'business'],
        ['email' => 'e2e_business_02@test.local', 'name' => 'E2E Business 02', 'role' => 'business'],
        ['email' => 'e2e_business_03@test.local', 'name' => 'E2E Business 03', 'role' => 'business'],
        ['email' => 'e2e_business_04@test.local', 'name' => 'E2E Business 04', 'role' => 'business'],
        ['email' => 'e2e_business_05@test.local', 'name' => 'E2E Business 05', 'role' => 'business'],
        
        // Admin users (3 users)
        ['email' => 'e2e_admin_01@test.local', 'name' => 'E2E Admin 01', 'role' => 'admin'],
        ['email' => 'e2e_admin_02@test.local', 'name' => 'E2E Admin 02', 'role' => 'admin'],
        ['email' => 'e2e_admin_03@test.local', 'name' => 'E2E Admin 03', 'role' => 'admin'],
    ];

    private $password = 'E2eTest@123';

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('');
        $this->command->info('========================================');
        $this->command->info('  E2E Isolated Test Users Seeder');
        $this->command->info('  Created: ' . now()->toISOString());
        $this->command->info('========================================');
        $this->command->info('');

        $created = 0;
        $skipped = 0;

        foreach ($this->testUsers as $userData) {
            $existing = User::where('email', $userData['email'])->first();
            
            if ($existing) {
                $this->command->warn("  [SKIP] {$userData['email']} already exists");
                $skipped++;
                continue;
            }

            User::create([
                'name' => $userData['name'],
                'email' => $userData['email'],
                'password' => Hash::make($this->password),
                'role' => $userData['role'],
                'email_verified_at' => now(),
                'level' => 'beginner',
                'domain' => 'backend',
            ]);

            $this->command->info("  [OK] Created {$userData['role']}: {$userData['email']}");
            $created++;
        }

        $this->command->info('');
        $this->command->info("Summary: Created {$created}, Skipped {$skipped}");
        $this->command->info('');
    }
}
