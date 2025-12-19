<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    public function run()
    {
        $email = env('ADMIN_EMAIL', 'admin@example.com');
        $name = env('ADMIN_NAME', 'Admin');
        $password = env('ADMIN_PASSWORD', 'password');

        $user = User::where('email', $email)->first();
        if ($user) {
            $this->command->info("Admin user with email {$email} already exists (id={$user->id}).");
            return;
        }

        $admin = User::create([
            'name' => $name,
            'email' => $email,
            'password' => $password,
            'role' => 'admin',
        ]);

        $this->command->info("Created admin user {$email} (id={$admin->id}).");
    }
}
