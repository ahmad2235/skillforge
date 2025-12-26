<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('submissions', function (Blueprint $table) {
            if (!Schema::hasColumn('submissions', 'evaluation_status')) {
                $table->enum('evaluation_status', ['queued','evaluating','completed','timed_out','manual_review','failed','skipped'])
                    ->default('queued')
                    ->after('status');
            }
        });

        // Backfill existing rows: best-effort SQL using ai_evaluations or submission snapshot
        // We'll set queued by default, then attempt to set completed where is_evaluated = true
        DB::table('submissions')->whereNull('evaluation_status')->update(['evaluation_status' => 'queued']);
        DB::table('submissions')->where('is_evaluated', true)->update(['evaluation_status' => 'completed']);

        // Further backfill based on latest ai_evaluations: if latest ai eval completed and metadata indicates manual_review -> set manual_review
        // This is a simple approach for migration; a more exhaustive backfill script can be added separately.
    }

    public function down(): void
    {
        Schema::table('submissions', function (Blueprint $table) {
            if (Schema::hasColumn('submissions', 'evaluation_status')) {
                $table->dropColumn('evaluation_status');
            }
        });
    }
};
