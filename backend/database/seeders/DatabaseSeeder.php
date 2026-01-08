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
        // Create or update test users with different roles (idempotent)
        User::updateOrCreate([
            'email' => 'admin@example.com',
        ], [
            'name' => 'Admin User',
            'role' => 'admin',
            'password' => bcrypt('password'),
        ]);

        User::updateOrCreate([
            'email' => 'business@example.com',
        ], [
            'name' => 'Business User',
            'role' => 'business',
            'password' => bcrypt('password'),
        ]);

        // Create or update student users with different levels and domains
        User::updateOrCreate([
            'email' => 'ahmed@example.com',
        ], [
            'name' => 'Ahmed Ali',
            'role' => 'student',
            'level' => 'beginner',
            'domain' => 'frontend',
            'password' => bcrypt('password'),
        ]);

        User::updateOrCreate([
            'email' => 'sara@example.com',
        ], [
            'name' => 'Sara Mohamed',
            'role' => 'student',
            'level' => 'intermediate',
            'domain' => 'backend',
            'password' => bcrypt('password'),
        ]);

        User::updateOrCreate([
            'email' => 'omar@example.com',
        ], [
            'name' => 'Omar Hassan',
            'role' => 'student',
            'level' => 'advanced',
            'domain' => 'frontend',
            'password' => bcrypt('password'),
        ]);

        User::updateOrCreate([
            'email' => 'fatima@example.com',
        ], [
            'name' => 'Fatima Khalid',
            'role' => 'student',
            'level' => 'beginner',
            'domain' => 'backend',
            'password' => bcrypt('password'),
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
