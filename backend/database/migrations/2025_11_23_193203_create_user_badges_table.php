<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_badges', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')
                  ->constrained('users')
                  ->onDelete('cascade');

            $table->foreignId('badge_id')
                  ->constrained('badges')
                  ->onDelete('cascade');

            // متى أُعطي الوسام
            $table->timestamp('awarded_at')->nullable();

            // مصدر الوسام (system, admin, ai...)
            $table->string('source', 50)->default('system');

            // أي بيانات إضافية (سبب، رابط مشروع، إلخ)
            $table->json('metadata')->nullable();

            $table->timestamps();

            $table->unique(['user_id', 'badge_id']); // نفس الوسام مرة واحدة فقط لكل مستخدم
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_badges');
    }
};
