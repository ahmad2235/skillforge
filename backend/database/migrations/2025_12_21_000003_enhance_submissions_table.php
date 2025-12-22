<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 9: Enhance submissions table with final_score, rubric_scores, evaluated_by, and indexes.
 * Keeps existing 'score' column for backward compatibility.
 * Code should prefer final_score; score is legacy and can be backfilled.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('submissions', function (Blueprint $table) {
            // Final score (preferred over legacy 'score')
            if (!Schema::hasColumn('submissions', 'final_score')) {
                $table->decimal('final_score', 5, 2)->nullable()->after('score');
            }

            // Rubric breakdown scores as JSON
            if (!Schema::hasColumn('submissions', 'rubric_scores')) {
                $table->json('rubric_scores')->nullable()->after('final_score');
            }

            // Who evaluated: admin or system (AI)
            if (!Schema::hasColumn('submissions', 'evaluated_by')) {
                $table->enum('evaluated_by', ['admin', 'system'])->nullable()->after('rubric_scores');
            }

            // Indexes for common queries
            $table->index(['user_id', 'task_id'], 'submissions_user_task_idx');
            $table->index('task_id', 'submissions_task_idx');
            $table->index('status', 'submissions_status_idx');
        });
    }

    public function down(): void
    {
        Schema::table('submissions', function (Blueprint $table) {
            // Drop indexes
            $table->dropIndex('submissions_user_task_idx');
            $table->dropIndex('submissions_task_idx');
            $table->dropIndex('submissions_status_idx');

            // Drop columns
            if (Schema::hasColumn('submissions', 'final_score')) {
                $table->dropColumn('final_score');
            }
            if (Schema::hasColumn('submissions', 'rubric_scores')) {
                $table->dropColumn('rubric_scores');
            }
            if (Schema::hasColumn('submissions', 'evaluated_by')) {
                $table->dropColumn('evaluated_by');
            }
        });
    }
};
