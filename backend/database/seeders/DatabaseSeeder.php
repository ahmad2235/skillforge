<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Create test users with different roles
        User::factory()->create([
            'name' => 'Admin User',
            'email' => 'admin@example.com',
            'role' => 'admin',
        ]);

        User::factory()->create([
            'name' => 'Business User',
            'email' => 'business@example.com',
            'role' => 'business',
        ]);

        // Create student users with different levels and domains
        User::factory()->create([
            'name' => 'Ahmed Ali',
            'email' => 'ahmed@example.com',
            'role' => 'student',
            'level' => 'beginner',
            'domain' => 'frontend',
        ]);

        User::factory()->create([
            'name' => 'Sara Mohamed',
            'email' => 'sara@example.com',
            'role' => 'student',
            'level' => 'intermediate',
            'domain' => 'backend',
        ]);

        User::factory()->create([
            'name' => 'Omar Hassan',
            'email' => 'omar@example.com',
            'role' => 'student',
            'level' => 'advanced',
            'domain' => 'frontend',
        ]);

        User::factory()->create([
            'name' => 'Fatima Khalid',
            'email' => 'fatima@example.com',
            'role' => 'student',
            'level' => 'beginner',
            'domain' => 'backend',
        ]);

        // Ensure a deterministic admin exists (can be overridden via .env)
        $this->call(\Database\Seeders\AdminUserSeeder::class);

        // Core learning/assessment data
        $this->call([
            RoadmapBlockSeeder::class,
            TaskSeeder::class,
            QuestionSeeder::class,
            ProjectSeeder::class,
            ProjectAssignmentSeeder::class,
        ]);
    }
}
