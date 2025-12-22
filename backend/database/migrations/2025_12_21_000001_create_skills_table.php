<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 9: Create skills table for structured skill tracking.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('skills', function (Blueprint $table) {
            $table->id();
            $table->string('code', 120)->unique();           // e.g. 'html', 'css', 'js-basics'
            $table->string('name', 150);                     // Human-readable name
            $table->text('description')->nullable();         // Optional long description
            $table->enum('domain', ['frontend', 'backend']); // Match existing domain values
            $table->enum('level', ['beginner', 'intermediate', 'advanced']); // Match existing levels
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            // Composite index for filtering by domain+level+active
            $table->index(['domain', 'level', 'is_active'], 'skills_domain_level_active_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('skills');
    }
};
