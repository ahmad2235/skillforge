<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_logs', function (Blueprint $table) {
            $table->id();

            // المستخدم المرتبط بالطلب (إن وجد)
            $table->foreignId('user_id')
                  ->nullable()
                  ->constrained('users')
                  ->onDelete('set null');

            // لو الـ AI شغّال على تقييم تسليم مهمة
            $table->foreignId('submission_id')
                  ->nullable()
                  ->constrained('submissions')
                  ->onDelete('cascade');

            // أو لو شغّال على تقييم نتيجة placement
            $table->foreignId('placement_result_id')
                  ->nullable()
                  ->constrained('placement_results')
                  ->onDelete('cascade');

            // نوع الاستخدام (نفس أنواعه في templates)
            $table->enum('type', ['placement', 'task_feedback', 'matching', 'other'])
                  ->default('other');

            // أي template استُخدم
            $table->foreignId('prompt_template_id')
                  ->nullable()
                  ->constrained('ai_prompt_templates')
                  ->onDelete('set null');

            // النص النهائي للـ prompt المرسل فعلياً
            $table->longText('prompt');

            // الرد من الـ AI (text أو JSON)
            $table->longText('response')->nullable();

            // معلومات عن الموديل/الإصدار
            $table->string('model', 100)->nullable();

            // إحصائيات tokens (اختياري)
            $table->integer('prompt_tokens')->nullable();
            $table->integer('completion_tokens')->nullable();
            $table->integer('total_tokens')->nullable();

            // حالة الطلب
            $table->enum('status', ['success', 'error'])
                  ->default('success');

            $table->text('error_message')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_logs');
    }
};
