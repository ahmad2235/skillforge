<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('submissions', function (Blueprint $table) {
            $table->id();

            // الطالب اللي قدّم الحل
            $table->foreignId('user_id')
                  ->constrained('users')
                  ->onDelete('cascade');

            // لأي مهمة هذا الحل
            $table->foreignId('task_id')
                  ->constrained('tasks')
                  ->onDelete('cascade');

            // محتوى الحل: ممكن يكون نص، كود، رابط GitHub...
            $table->longText('answer_text')->nullable();

            // ممكن نخزن رابط GitHub أو ملف ZIP أو غيره
            $table->string('attachment_url')->nullable();

            // حالة التصحيح/التقييم
            $table->enum('status', ['submitted', 'evaluating', 'evaluated', 'rejected'])
                  ->default('submitted');

            // الدرجة النهائية
            $table->decimal('score', 5, 2)->nullable();

            // Feedback من الـ AI
            $table->text('ai_feedback')->nullable();

            // بيانات إضافية من الـ AI أو النظام (tokens, raw response...)
            $table->json('metadata')->nullable();

            // وقت الإرسال
            $table->timestamp('submitted_at')->nullable();

            // وقت التقييم
            $table->timestamp('evaluated_at')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('submissions');
    }
};
