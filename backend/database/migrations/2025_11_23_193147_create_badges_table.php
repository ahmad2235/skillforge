<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('badges', function (Blueprint $table) {
            $table->id();

            // كود داخلي ثابت (مثلاً: FIRST_PROJECT, ROADMAP_COMPLETED_BEGINNER)
            $table->string('code', 100)->unique();

            // اسم الوسام يظهر للطالب
            $table->string('name', 150);

            // وصف مختصر
            $table->text('description')->nullable();

            // مستوى / دومين مستهدف (اختياري)
            $table->enum('level', ['beginner', 'intermediate', 'advanced'])
                  ->nullable();

            $table->enum('domain', ['frontend', 'backend'])
                  ->nullable();

            // أي شروط/معايير كـ JSON (مثلاً: min_tasks_completed)
            $table->json('criteria')->nullable();

            // رابط أيقونة
            $table->string('icon_url')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('badges');
    }
};
