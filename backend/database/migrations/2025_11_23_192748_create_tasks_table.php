<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tasks', function (Blueprint $table) {
            $table->id();

            // لأي بلوك تنتمي هذه المهمة
            $table->foreignId('roadmap_block_id')
                  ->constrained('roadmap_blocks')
                  ->onDelete('cascade');

            $table->string('title', 150);
            $table->longText('description')->nullable();

            // نوع المهمة (مستقبلاً مهم في منطق الـ AI)
            $table->enum('type', ['theory', 'coding', 'quiz', 'project'])
                  ->default('coding');

            // صعوبة تقريبية 1-5
            $table->unsignedTinyInteger('difficulty')->default(1);

            // أقصى درجة (لو حبيت تستخدمها مع AI)
            $table->decimal('max_score', 5, 2)->default(100);

            // مجال التخزين لأي شيء إضافي: template, starter code, etc.
            $table->json('metadata')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tasks');
    }
};
