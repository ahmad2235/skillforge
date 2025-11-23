<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_roadmap_blocks', function (Blueprint $table) {
            $table->id();

            // الطالب
            $table->foreignId('user_id')
                  ->constrained('users')
                  ->onDelete('cascade');

            // البلوك
            $table->foreignId('roadmap_block_id')
                  ->constrained('roadmap_blocks')
                  ->onDelete('cascade');

            // حالة تقدّم الطالب في هذا البلوك
            $table->enum('status', ['locked', 'in_progress', 'completed', 'skipped'])
                  ->default('locked');

            // متى بدأ البلوك (لو بدأه)
            $table->timestamp('started_at')->nullable();

            // متى أنهى البلوك (لو أنجزه)
            $table->timestamp('completed_at')->nullable();

            $table->timestamps();

            // منع تكرار record لنفس (user, block)
            $table->unique(['user_id', 'roadmap_block_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_roadmap_blocks');
    }
};
