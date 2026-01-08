<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Step 1: Add new columns for invite tokens and tracking (check if they exist first)
        Schema::table('project_assignments', function (Blueprint $table) {
            if (!Schema::hasColumn('project_assignments', 'invite_token_hash')) {
                $table->string('invite_token_hash', 64)->nullable()->after('status');
            }
            if (!Schema::hasColumn('project_assignments', 'invite_expires_at')) {
                $table->timestamp('invite_expires_at')->nullable()->after('invite_token_hash');
            }
            if (!Schema::hasColumn('project_assignments', 'invited_at')) {
                $table->timestamp('invited_at')->nullable()->after('invite_expires_at');
            }
            if (!Schema::hasColumn('project_assignments', 'cancelled_reason')) {
                $table->string('cancelled_reason')->nullable()->after('notes');
            }
        });

        // Add indexes if they don't exist
        try {
            Schema::table('project_assignments', function (Blueprint $table) {
                $table->index('invite_token_hash');
                $table->index('invite_expires_at');
            });
        } catch (\Exception $e) {
            // Indexes might already exist
        }

        // Step 2: Modify status enum FIRST to include both old and new values
        DB::statement("ALTER TABLE project_assignments MODIFY COLUMN status ENUM('pending', 'accepted', 'declined', 'cancelled', 'completed', 'invited', 'rejected', 'removed') DEFAULT 'pending'");

        // Step 3: Backfill existing data and normalize statuses
        DB::table('project_assignments')->where('status', 'invited')->update([
            'status' => 'pending',
            'invited_at' => DB::raw('COALESCE(created_at, NOW())'),
        ]);

        DB::table('project_assignments')->where('status', 'rejected')->update([
            'status' => 'declined',
        ]);

        DB::table('project_assignments')->where('status', 'removed')->update([
            'status' => 'cancelled',
            'cancelled_reason' => 'removed_by_owner',
        ]);

        // Step 4: Now remove old enum values
        DB::statement("ALTER TABLE project_assignments MODIFY COLUMN status ENUM('pending', 'accepted', 'declined', 'cancelled', 'completed') DEFAULT 'pending'");

        // Step 5: Remove the unique constraint on (project_id, user_id, team_id)
        try {
            Schema::table('project_assignments', function (Blueprint $table) {
                $table->dropUnique(['project_id', 'user_id', 'team_id']);
            });
        } catch (\Exception $e) {
            // Constraint might not exist
        }

        // Step 6: Application will handle duplicate prevention since MySQL partial indexes
        // are not well supported across versions
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop the partial unique index
        try {
            DB::statement('DROP INDEX unique_pending_project_user ON project_assignments');
        } catch (\Exception $e) {
            // Continue if doesn't exist
        }

        // Restore old unique constraint
        Schema::table('project_assignments', function (Blueprint $table) {
            try {
                $table->unique(['project_id', 'user_id', 'team_id']);
            } catch (\Exception $e) {
                // Continue
            }
        });

        // Restore old enum values (add back old values first)
        DB::statement("ALTER TABLE project_assignments MODIFY COLUMN status ENUM('pending', 'accepted', 'rejected', 'completed', 'cancelled', 'invited', 'removed') DEFAULT 'pending'");

        // Restore old statuses
        DB::table('project_assignments')->where('status', 'pending')->update(['status' => 'invited']);
        DB::table('project_assignments')->where('status', 'declined')->update(['status' => 'rejected']);
        DB::table('project_assignments')->where('status', 'cancelled')->update(['status' => 'removed']);

        // Remove new columns
        Schema::table('project_assignments', function (Blueprint $table) {
            $table->dropIndex(['invite_token_hash']);
            $table->dropIndex(['invite_expires_at']);
            $table->dropColumn([
                'invite_token_hash',
                'invite_expires_at',
                'invited_at',
                'cancelled_reason',
            ]);
        });
    }
};
