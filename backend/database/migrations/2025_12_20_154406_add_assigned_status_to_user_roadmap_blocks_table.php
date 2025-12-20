<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('user_roadmap_blocks', function (Blueprint $table) {
            $table->enum('status', ['locked', 'assigned', 'in_progress', 'completed', 'skipped'])
                  ->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('user_roadmap_blocks', function (Blueprint $table) {
            $table->enum('status', ['locked', 'in_progress', 'completed', 'skipped'])
                  ->change();
        });
    }
};
