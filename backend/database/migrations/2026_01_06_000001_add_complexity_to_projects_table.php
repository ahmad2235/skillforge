<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration: Add complexity column to projects table
 * 
 * This column is required by the cosine-similarity recommender system.
 * It works together with required_level to compute the "adjusted required level"
 * which determines student eligibility for projects.
 * 
 * Business Rule: complexity upgrades minimum required level:
 *   - low complexity    → minimum beginner
 *   - medium complexity → minimum intermediate  
 *   - high complexity   → minimum advanced
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            // Add complexity column after required_level for logical grouping
            $table->enum('complexity', ['low', 'medium', 'high'])
                  ->default('low')
                  ->after('required_level')
                  ->comment('Project complexity level - affects candidate matching');
        });
    }

    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropColumn('complexity');
        });
    }
};
