<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ai_logs', function (Blueprint $table) {
            $table->string('action')->nullable()->after('type');
            $table->json('input_json')->nullable()->after('prompt');
            $table->json('output_json')->nullable()->after('response');
            $table->json('metadata_json')->nullable()->after('output_json');
        });
    }

    public function down(): void
    {
        Schema::table('ai_logs', function (Blueprint $table) {
            $table->dropColumn(['action', 'input_json', 'output_json', 'metadata_json']);
        });
    }
};
