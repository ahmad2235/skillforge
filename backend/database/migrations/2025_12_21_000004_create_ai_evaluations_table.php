<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Create ai_evaluations table for append-only AI evaluation history.
 * Complements existing submissions columns (ai_score, ai_feedback, ai_metadata).
 * 
 * submissions table = latest snapshot (fast reads)
 * ai_evaluations table = full history (audit trail)
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_evaluations', function (Blueprint $table) {
            $table->id();
            
            // Link to submission
            $table->foreignId('submission_id')
                ->constrained('submissions')
                ->onDelete('cascade');
            
            // AI provider details
            $table->string('provider', 50)->default('openai');
            $table->string('model', 100)->nullable();
            $table->string('prompt_version', 50)->nullable();
            
            // Evaluation lifecycle
            $table->enum('status', ['queued', 'running', 'succeeded', 'failed'])
                ->default('queued');
            
            // Evaluation results
            $table->decimal('score', 5, 2)->nullable();
            $table->text('feedback')->nullable();
            $table->json('rubric_scores')->nullable();
            $table->json('metadata')->nullable();
            $table->text('error_message')->nullable();
            
            // Timing
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            
            // Indexes for common queries
            $table->index(['submission_id', 'created_at'], 'ai_evals_submission_created_idx');
            $table->index('status', 'ai_evals_status_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_evaluations');
    }
};
