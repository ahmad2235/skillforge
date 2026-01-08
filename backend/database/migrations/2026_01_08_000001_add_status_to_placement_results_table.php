<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('placement_results', function (Blueprint $table) {
            $table->string('status')->default('pending')->after('is_active');
            $table->timestamp('evaluation_started_at')->nullable()->after('status');
            $table->timestamp('evaluation_completed_at')->nullable()->after('evaluation_started_at');
            $table->json('pending_answers')->nullable()->after('details');
        });
    }

    public function down(): void
    {
        Schema::table('placement_results', function (Blueprint $table) {
            $table->dropColumn(['status', 'evaluation_started_at', 'evaluation_completed_at', 'pending_answers']);
        });
    }
};