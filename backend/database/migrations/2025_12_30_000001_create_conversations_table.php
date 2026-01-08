<?php

/**
 * CONVERSATIONS TABLE MIGRATION
 * 
 * PURPOSE: Store 1-to-1 chat conversations between students and business owners.
 * 
 * SYSTEM CONTRACT (NON-NEGOTIABLE):
 * - Exactly ONE conversation per student-business pair
 * - student_id ALWAYS stores the student user
 * - owner_id ALWAYS stores the business owner user
 * - No groups, no multi-party conversations
 * - No deletes (append-only system)
 * 
 * WHY UNIQUE(student_id, owner_id):
 * - Prevents duplicate conversations under any race condition
 * - Enforced at database level, not application level
 * - Client cannot create duplicate conversations even with concurrent requests
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('conversations', function (Blueprint $table) {
            // Primary key - bigint auto-increment
            $table->id();
            
            // student_id: MUST be a user with role='student'
            // Enforced at application level, FK ensures referential integrity
            $table->unsignedBigInteger('student_id');
            $table->foreign('student_id')
                  ->references('id')
                  ->on('users')
                  ->onDelete('cascade');
            
            // owner_id: MUST be a user with role='business'
            // Enforced at application level, FK ensures referential integrity
            $table->unsignedBigInteger('owner_id');
            $table->foreign('owner_id')
                  ->references('id')
                  ->on('users')
                  ->onDelete('cascade');
            
            // Timestamps - created_at only matters, no updates expected
            $table->timestamps();
            
            // CRITICAL: Unique constraint prevents duplicate conversations
            // This is the PRIMARY defense against race conditions
            $table->unique(['student_id', 'owner_id'], 'conversations_student_owner_unique');
            
            // Indexes for efficient lookup by either party
            $table->index('student_id', 'conversations_student_id_index');
            $table->index('owner_id', 'conversations_owner_id_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('conversations');
    }
};
