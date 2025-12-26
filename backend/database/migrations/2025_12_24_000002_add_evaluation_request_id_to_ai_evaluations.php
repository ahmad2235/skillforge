<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ai_evaluations', function (Blueprint $table) {
            if (!Schema::hasColumn('ai_evaluations', 'evaluation_request_id')) {
                $table->uuid('evaluation_request_id')->nullable()->after('id')->index();
            }
            if (!Schema::hasColumn('ai_evaluations', 'semantic_status')) {
                $table->string('semantic_status', 50)->nullable()->after('status');
            }
        });
    }

    public function down(): void
    {
        Schema::table('ai_evaluations', function (Blueprint $table) {
            if (Schema::hasColumn('ai_evaluations', 'evaluation_request_id')) {
                $table->dropColumn('evaluation_request_id');
            }
            if (Schema::hasColumn('ai_evaluations', 'semantic_status')) {
                $table->dropColumn('semantic_status');
            }
        });
    }
};
