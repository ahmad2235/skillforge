<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('placement_results', function (Blueprint $table) {
            $table->id();

            // الطالب صاحب الاختبار
            $table->foreignId('user_id')
                  ->constrained('users')
                  ->onDelete('cascade');

            // المستوى النهائي اللي النظام قرره
            $table->enum('final_level', ['beginner', 'intermediate', 'advanced']);

            // الدومين النهائي
            $table->enum('final_domain', ['frontend', 'backend']);

            // درجة عامة (مثلاً من 100)
            $table->decimal('overall_score', 5, 2)->nullable();

            // أي تفاصيل إضافية (JSON) - مثل توزيع الدرجات
            $table->json('details')->nullable();

            // هل هذا آخر نتيجة نشطة (لو عمل أكثر من اختبار)
            $table->boolean('is_active')->default(true);

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('placement_results');
    }
};
