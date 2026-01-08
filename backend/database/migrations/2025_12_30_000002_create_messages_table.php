<?php

/**
 * MESSAGES TABLE MIGRATION
 * 
 * PURPOSE: Store chat messages in append-only fashion.
 * 
 * SYSTEM CONTRACT (NON-NEGOTIABLE):
 * - Messages are NEVER updated or deleted
 * - No edits, no soft deletes, no hard deletes
 * - DB ID is authoritative (client tempId is for optimistic UI only)
 * - No attachments, no reactions, no read receipts
 * 
 * WHY APPEND-ONLY:
 * - Simplifies reasoning about message state
 * - No race conditions on updates
 * - Audit trail is automatic
 * - Pagination is stable (no gaps from deletes)
 * 
 * WHY INDEX(conversation_id, created_at):
 * - Most common query: "get messages for conversation X, ordered by time"
 * - Composite index makes this query use index-only scan
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('messages', function (Blueprint $table) {
            // Primary key - bigint auto-increment
            // This is the authoritative message ID
            $table->id();
            
            // conversation_id: Links to conversations table
            $table->unsignedBigInteger('conversation_id');
            $table->foreign('conversation_id')
                  ->references('id')
                  ->on('conversations')
                  ->onDelete('cascade');
            
            // sender_id: The user who sent this message
            // MUST be either student_id or owner_id from the conversation
            // Enforced at application level
            $table->unsignedBigInteger('sender_id');
            $table->foreign('sender_id')
                  ->references('id')
                  ->on('users')
                  ->onDelete('cascade');
            
            // message: The actual text content
            // TEXT type allows up to 65KB which is plenty for chat
            // No rich text, no HTML, plain text only
            $table->text('message');
            
            // created_at: When the message was persisted
            // This is the authoritative timestamp, not client time
            // updated_at included but should never change (append-only)
            $table->timestamps();
            
            // CRITICAL: Composite index for efficient message retrieval
            // Query pattern: WHERE conversation_id = ? ORDER BY created_at DESC
            $table->index(['conversation_id', 'created_at'], 'messages_conversation_created_index');
            
            // Index for sender lookup (e.g., "all messages by user X")
            $table->index('sender_id', 'messages_sender_id_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('messages');
    }
};
