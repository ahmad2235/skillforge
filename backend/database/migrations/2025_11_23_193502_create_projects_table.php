<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('projects', function (Blueprint $table) {
            $table->id();

            // صاحب المشروع (user role=business)
            $table->foreignId('owner_id')
                  ->constrained('users')
                  ->onDelete('cascade');

            $table->string('title', 150);
            $table->text('description')->nullable();

            // الدومين المطلوب
            $table->enum('domain', ['frontend', 'backend']);

            // المستوى المطلوب
            $table->enum('required_level', ['beginner', 'intermediate', 'advanced'])
                  ->nullable();

            // حد أدنى لتقييم الطالب (مثلاً based on AI + history)
            $table->decimal('min_score_required', 5, 2)->nullable();

            // حالة المشروع
            $table->enum('status', ['draft', 'open', 'in_progress', 'completed', 'cancelled'])
                  ->default('open');

            // حجم الفريق المطلوب (إن أحببت)
            $table->unsignedTinyInteger('min_team_size')->nullable();
            $table->unsignedTinyInteger('max_team_size')->nullable();

            // مدة تقديرية بالأسابيع
            $table->unsignedTinyInteger('estimated_duration_weeks')->nullable();

            // ميزانية تقديرية أو معلومات إضافية
            $table->json('metadata')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('projects');
    }
};
