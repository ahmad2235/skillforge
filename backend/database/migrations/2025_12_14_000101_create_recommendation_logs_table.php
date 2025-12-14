<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('recommendation_logs', function (Blueprint $table) {
            $table->id();
            $table->string('context_type');
            $table->unsignedBigInteger('context_id')->nullable();
            $table->json('ranked_entities');
            $table->string('model_version')->default('rule-based-v0');
            $table->json('features_used')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['context_type', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('recommendation_logs');
    }
};
