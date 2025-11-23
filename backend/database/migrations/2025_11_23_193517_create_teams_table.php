<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('teams', function (Blueprint $table) {
            $table->id();

            // لأي مشروع هذا الفريق (اختياري، ممكن يكون عام)
            $table->foreignId('project_id')
                  ->nullable()
                  ->constrained('projects')
                  ->onDelete('cascade');

            // مالك الفريق (غالباً business أو system)
            $table->foreignId('owner_id')
                  ->constrained('users')
                  ->onDelete('cascade');

            $table->string('name', 150)->nullable();

            $table->enum('status', ['active', 'archived'])
                  ->default('active');

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('teams');
    }
};
