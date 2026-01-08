<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Add performance indexes for frequently queried columns.
 * Identified via NFR audit - these columns are used in WHERE clauses
 * without corresponding indexes.
 */
return new class extends Migration
{
    public function up(): void
    {
        // Submissions table - evaluation_status and updated_at used in cleanup queries
        Schema::table('submissions', function (Blueprint $table) {
            $table->index('evaluation_status', 'submissions_eval_status_idx');
            $table->index('updated_at', 'submissions_updated_at_idx');
        });

        // Projects table - owner_id and status used in business filtering
        Schema::table('projects', function (Blueprint $table) {
            $table->index('owner_id', 'projects_owner_idx');
            $table->index('status', 'projects_status_idx');
        });

        // Project assignments - status used in assignment filtering
        Schema::table('project_assignments', function (Blueprint $table) {
            $table->index('status', 'project_assignments_status_idx');
        });

        // Questions table - domain and level used in placement queries
        Schema::table('questions', function (Blueprint $table) {
            $table->index(['domain', 'level'], 'questions_domain_level_idx');
        });

        // Roadmap blocks - compound index for level + domain + order queries
        Schema::table('roadmap_blocks', function (Blueprint $table) {
            $table->index(['level', 'domain', 'order_index'], 'blocks_level_domain_order_idx');
        });

        // AI logs - created_at used in log queries and ordering
        Schema::table('ai_logs', function (Blueprint $table) {
            $table->index('created_at', 'ai_logs_created_at_idx');
        });
    }

    public function down(): void
    {
        Schema::table('submissions', function (Blueprint $table) {
            $table->dropIndex('submissions_eval_status_idx');
            $table->dropIndex('submissions_updated_at_idx');
        });

        Schema::table('projects', function (Blueprint $table) {
            $table->dropIndex('projects_owner_idx');
            $table->dropIndex('projects_status_idx');
        });

        Schema::table('project_assignments', function (Blueprint $table) {
            $table->dropIndex('project_assignments_status_idx');
        });

        Schema::table('questions', function (Blueprint $table) {
            $table->dropIndex('questions_domain_level_idx');
        });

        Schema::table('roadmap_blocks', function (Blueprint $table) {
            $table->dropIndex('blocks_level_domain_order_idx');
        });

        Schema::table('ai_logs', function (Blueprint $table) {
            $table->dropIndex('ai_logs_created_at_idx');
        });
    }
};
