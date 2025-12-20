<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('project_milestone_submissions')) {
            return; // table already provisioned elsewhere; don't recreate
        }

        Schema::create('project_milestone_submissions', function (Blueprint $table) {
            $table->id();

            $table->foreignId('project_assignment_id')
                ->constrained('project_assignments')
                ->onDelete('cascade');

            $table->foreignId('project_milestone_id')
                ->constrained('project_milestones')
                ->onDelete('cascade');

            $table->foreignId('user_id')
                ->constrained('users')
                ->onDelete('cascade');

            $table->text('answer_text')->nullable();
            $table->string('attachment_url')->nullable();

            $table->enum('status', ['submitted', 'reviewed', 'approved', 'rejected'])
                ->default('submitted');

            $table->text('review_feedback')->nullable();

            $table->foreignId('reviewed_by')
                ->nullable()
                ->constrained('users')
                ->onDelete('set null');

            $table->timestamp('reviewed_at')->nullable();

            $table->timestamps();

            // Short, explicit name to satisfy MySQL index length limits.
            $table->unique(
                ['project_assignment_id', 'project_milestone_id'],
                'pms_assignment_milestone_unique'
            );
            $table->index(['project_milestone_id', 'status']);
        });
    }

    public function down(): void
    {
        // no-op to avoid dropping data if the table pre-existed this migration
    }
};
