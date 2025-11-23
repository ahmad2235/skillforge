<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('team_members', function (Blueprint $table) {
            $table->id();

            $table->foreignId('team_id')
                  ->constrained('teams')
                  ->onDelete('cascade');

            $table->foreignId('user_id')
                  ->constrained('users')
                  ->onDelete('cascade');

            // دور الطالب داخل الفريق (leader, member...)
            $table->string('role', 50)->nullable();

            $table->enum('status', ['invited', 'joined', 'left'])
                  ->default('joined');

            $table->timestamp('joined_at')->nullable();
            $table->timestamp('left_at')->nullable();

            $table->timestamps();

            $table->unique(['team_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('team_members');
    }
};
