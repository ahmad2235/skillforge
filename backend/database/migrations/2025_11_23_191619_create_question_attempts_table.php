<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('question_attempts', function (Blueprint $table) {
            $table->id();

            // الطالب
            $table->foreignId('user_id')
                  ->constrained('users')
                  ->onDelete('cascade');

            // أي اختبار placement ينتمي له هذا السؤال
            $table->foreignId('placement_result_id')
                  ->constrained('placement_results')
                  ->onDelete('cascade');

            // السؤال نفسه
            $table->foreignId('question_id')
                  ->constrained('questions')
                  ->onDelete('cascade');

            // إجابة الطالب (نص أو كود)
            $table->longText('answer_text')->nullable();

            // درجة هذا السؤال
            $table->decimal('score', 5, 2)->nullable();

            // Feedback من الـ AI (نص)
            $table->text('ai_feedback')->nullable();

            // JSON لأي data إضافية (tokens، raw response، إلخ)
            $table->json('metadata')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('question_attempts');
    }
};
