<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('submissions', function (Blueprint $table) {
            // Check if columns exist before adding
            if (!Schema::hasColumn('submissions', 'ai_score')) {
                $table->unsignedTinyInteger('ai_score')
                    ->nullable()
                    ->after('score');
            }

            if (!Schema::hasColumn('submissions', 'ai_metadata')) {
                $table->json('ai_metadata')
                    ->nullable()
                    ->after('ai_feedback');
            }

            if (!Schema::hasColumn('submissions', 'is_evaluated')) {
                $table->boolean('is_evaluated')
                    ->default(false)
                    ->after('ai_metadata');
            }
        });
    }

    public function down(): void
    {
        Schema::table('submissions', function (Blueprint $table) {
            if (Schema::hasColumn('submissions', 'ai_score')) {
                $table->dropColumn('ai_score');
            }
            if (Schema::hasColumn('submissions', 'ai_metadata')) {
                $table->dropColumn('ai_metadata');
            }
            if (Schema::hasColumn('submissions', 'is_evaluated')) {
                $table->dropColumn('is_evaluated');
            }
        });
    }
};
