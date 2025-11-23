<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('portfolios', function (Blueprint $table) {
            $table->id();

            // صاحب البورتفوليو (الطالب)
            $table->foreignId('user_id')
                  ->constrained('users')
                  ->onDelete('cascade');

            // لو كان هذا المشروع تابع لمشروع مستوى معيّن
            $table->foreignId('level_project_id')
                  ->nullable()
                  ->constrained('level_projects')
                  ->onDelete('set null');

            // لو كان المشروع نتيجة مشروع حقيقي (تقسيم مشاريع أصحاب الأعمال)
     $table->unsignedBigInteger('project_id')
                  ->nullable()
                  ->constrained('projects')  // جدول projects راح نعرّفه بعد قليل
                  ->onDelete('set null');

            $table->string('title', 150);
            $table->text('description')->nullable();

            // روابط مهمة
            $table->string('github_url')->nullable();
            $table->string('live_demo_url')->nullable();

            // تقييم عام للمشروع (من 100 مثلاً)
            $table->decimal('score', 5, 2)->nullable();

            // Feedback عام من الـ AI أو من المشرف
            $table->text('feedback')->nullable();

            // هل المشروع ظاهر للعلن (لأصحاب الأعمال)
            $table->boolean('is_public')->default(true);

            // JSON لأي بيانات إضافية
            $table->json('metadata')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('portfolios');
    }
};
