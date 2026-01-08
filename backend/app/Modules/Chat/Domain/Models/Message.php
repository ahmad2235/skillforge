<?php

/**
 * MESSAGE MODEL
 * 
 * PURPOSE: Eloquent model for chat messages.
 * 
 * SYSTEM CONTRACT (NON-NEGOTIABLE):
 * - Messages are APPEND-ONLY (never updated, never deleted)
 * - sender_id MUST be either student_id or owner_id of the conversation
 * - DB ID is authoritative (client tempId is discarded after save)
 * - No attachments, no edits, no reactions, no read receipts
 * 
 * SUPPORTED OPERATIONS:
 * - Create (via saveMessage)
 * - Read (list with pagination)
 * 
 * UNSUPPORTED OPERATIONS:
 * - Update (append-only)
 * - Delete (append-only)
 */

namespace App\Modules\Chat\Domain\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Message extends Model
{
    /**
     * The table associated with the model.
     */
    protected $table = 'messages';

    /**
     * Mass assignable attributes.
     * 
     * WHY THESE FIELDS:
     * - conversation_id: Links to parent conversation
     * - sender_id: Who sent the message (validated at controller level)
     * - message: The actual text content
     */
    protected $fillable = [
        'conversation_id',
        'sender_id',
        'message',
    ];

    /**
     * Attributes that should be cast.
     */
    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Attributes to hide from arrays/JSON.
     * 
     * WHY HIDE updated_at:
     * - Messages are append-only, updated_at should never change
     * - Reduces payload size
     * - Prevents confusion about "last edited" semantics
     */
    protected $hidden = [
        'updated_at',
    ];

    /**
     * Get the conversation this message belongs to.
     */
    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class, 'conversation_id');
    }

    /**
     * Get the user who sent this message.
     */
    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    /**
     * Convert to array format expected by Socket.IO events.
     * 
     * WHY THIS METHOD:
     * - Consistent format between REST API and Socket events
     * - Single point of truth for message serialization
     * - Avoids exposing internal model structure
     * 
     * RETURNS:
     * {
     *   "id": 456,              // DB ID (authoritative)
     *   "conversationId": 123,
     *   "senderId": 9,
     *   "text": "Hello",
     *   "createdAt": "2025-12-30T12:00:00.000000Z"
     * }
     */
    public function toSocketFormat(): array
    {
        return [
            'id' => $this->id,
            'conversationId' => $this->conversation_id,
            'senderId' => $this->sender_id,
            'text' => $this->message,
            'createdAt' => $this->created_at->toIso8601String(),
        ];
    }
}
