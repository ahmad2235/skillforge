<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('level_projects', function (Blueprint $table) {
            $table->id();
            $table->enum('level', ['beginner', 'intermediate', 'advanced']);
            $table->string('title', 150);
            $table->text('brief')->nullable();      // وصف المطلوب من مشروع المستوى
            $table->json('rubric')->nullable();     // معايير التقييم
            $table->timestamps();                   // created_at, updated_at
            $table->softDeletes();                  // deleted_at
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('level_projects');
    }
};
