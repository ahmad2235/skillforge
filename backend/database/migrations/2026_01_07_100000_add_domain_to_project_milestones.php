<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('project_milestones', function (Blueprint $table) {
            // Add domain field: frontend, backend, or null (both/common)
            $table->enum('domain', ['frontend', 'backend'])->nullable()->after('is_required');
        });
    }

    public function down(): void
    {
        Schema::table('project_milestones', function (Blueprint $table) {
            $table->dropColumn('domain');
        });
    }
};
