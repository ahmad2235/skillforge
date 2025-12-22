<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Add latest_ai_evaluation_id FK to submissions for quick access to most recent evaluation.
 * Optional but recommended for performance when fetching latest evaluation details.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('submissions', function (Blueprint $table) {
            if (!Schema::hasColumn('submissions', 'latest_ai_evaluation_id')) {
                $table->foreignId('latest_ai_evaluation_id')
                    ->nullable()
                    ->after('evaluated_by')
                    ->constrained('ai_evaluations')
                    ->onDelete('set null');
                
                $table->index('latest_ai_evaluation_id', 'submissions_latest_ai_eval_idx');
            }
        });
    }

    public function down(): void
    {
        Schema::table('submissions', function (Blueprint $table) {
            if (Schema::hasColumn('submissions', 'latest_ai_evaluation_id')) {
                $table->dropForeign(['latest_ai_evaluation_id']);
                $table->dropIndex('submissions_latest_ai_eval_idx');
                $table->dropColumn('latest_ai_evaluation_id');
            }
        });
    }
};
