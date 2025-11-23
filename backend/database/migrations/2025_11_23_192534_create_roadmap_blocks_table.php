<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('roadmap_blocks', function (Blueprint $table) {
            $table->id();

            // لأي مستوى ينتمي هذا البلوك
            $table->enum('level', ['beginner', 'intermediate', 'advanced']);

            // لأي مجال (frontend/backend)
            $table->enum('domain', ['frontend', 'backend']);

            // عنوان البلوك (مثلاً: "Java Basics", "React Fundamentals")
            $table->string('title', 150);

            // وصف محتوى البلوك (ما الذي سيتعلمه الطالب)
            $table->text('description')->nullable();

            // ترتيب البلوك داخل المستوى/الدومين
            $table->unsignedInteger('order_index')->default(1);

            // تقدير تقريبي للوقت بالساعات (اختياري)
            $table->unsignedTinyInteger('estimated_hours')->nullable();

            // هل البلوك اختياري أم أساسي
            $table->boolean('is_optional')->default(false);

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('roadmap_blocks');
    }
};
