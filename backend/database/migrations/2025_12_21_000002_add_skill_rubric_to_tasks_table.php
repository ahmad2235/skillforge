<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 9: Add skill_id, rubric, weight, and indexes to tasks table.
 * Additive migration - does not break existing data.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            // Foreign key to skills (nullable, ON DELETE SET NULL)
            if (!Schema::hasColumn('tasks', 'skill_id')) {
                $table->foreignId('skill_id')
                    ->nullable()
                    ->after('roadmap_block_id')
                    ->constrained('skills')
                    ->onDelete('set null');
            }

            // Rubric JSON for structured scoring criteria
            if (!Schema::hasColumn('tasks', 'rubric')) {
                $table->json('rubric')->nullable()->after('metadata');
            }

            // Weight for task importance in block scoring
            if (!Schema::hasColumn('tasks', 'weight')) {
                $table->unsignedTinyInteger('weight')->default(1)->after('rubric');
            }

            // Composite index for filtering tasks by block and active status
            $table->index(['roadmap_block_id', 'is_active'], 'tasks_block_active_idx');

            // Index for skill lookups
            $table->index('skill_id', 'tasks_skill_idx');
        });
    }

    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            // Drop indexes first
            $table->dropIndex('tasks_block_active_idx');
            $table->dropIndex('tasks_skill_idx');

            // Drop foreign key and columns
            if (Schema::hasColumn('tasks', 'skill_id')) {
                $table->dropForeign(['skill_id']);
                $table->dropColumn('skill_id');
            }
            if (Schema::hasColumn('tasks', 'rubric')) {
                $table->dropColumn('rubric');
            }
            if (Schema::hasColumn('tasks', 'weight')) {
                $table->dropColumn('weight');
            }
        });
    }
};
