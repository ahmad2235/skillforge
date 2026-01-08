<?php

/**
 * CONVERSATION MODEL
 * 
 * PURPOSE: Eloquent model for 1-to-1 chat conversations.
 * 
 * SYSTEM CONTRACT (NON-NEGOTIABLE):
 * - student_id MUST reference a user with role='student'
 * - owner_id MUST reference a user with role='business'
 * - Exactly ONE conversation per student-business pair
 * - No groups, no multi-party
 * 
 * SUPPORTED OPERATIONS:
 * - Create (via getOrCreateConversation)
 * - Read (list, show)
 * 
 * UNSUPPORTED OPERATIONS:
 * - Update (no editable fields)
 * - Delete (append-only system)
 */

namespace App\Modules\Chat\Domain\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Conversation extends Model
{
    /**
     * The table associated with the model.
     */
    protected $table = 'conversations';

    /**
     * Mass assignable attributes.
     * 
     * WHY ONLY student_id AND owner_id:
     * - These are the only fields set at creation
     * - timestamps are automatic
     * - No other fields exist or should exist
     */
    protected $fillable = [
        'student_id',
        'owner_id',
    ];

    /**
     * Attributes that should be cast.
     */
    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the student in this conversation.
     * 
     * WHY SEPARATE RELATIONSHIPS:
     * - Clear semantic meaning (student vs owner)
     * - Efficient eager loading
     * - Type-safe access
     */
    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    /**
     * Get the business owner in this conversation.
     */
    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    /**
     * Get all messages in this conversation.
     * 
     * WHY ORDER BY created_at ASC:
     * - Default order is chronological (oldest first)
     * - Caller can override with ->latest() if needed
     */
    public function messages(): HasMany
    {
        return $this->hasMany(Message::class, 'conversation_id')
                    ->orderBy('created_at', 'asc');
    }

    /**
     * Check if a user is a participant in this conversation.
     * 
     * WHY THIS METHOD:
     * - Single point of truth for authorization
     * - Used by controllers before any read/write operation
     * - Prevents info leakage to non-participants
     */
    public function hasParticipant(int $userId): bool
    {
        return $this->student_id === $userId || $this->owner_id === $userId;
    }

    /**
     * Get the other participant's ID given one participant.
     * 
     * WHY THIS METHOD:
     * - Socket server needs to know who to notify
     * - Avoids exposing conversation structure to client
     */
    public function getOtherParticipantId(int $userId): ?int
    {
        if ($this->student_id === $userId) {
            return $this->owner_id;
        }
        if ($this->owner_id === $userId) {
            return $this->student_id;
        }
        return null; // User is not a participant
    }

    /**
     * Scope: Find conversations where user is either student or owner.
     * 
     * WHY SCOPE:
     * - Reusable query fragment
     * - Used for listing user's conversations
     */
    public function scopeForUser($query, int $userId)
    {
        return $query->where('student_id', $userId)
                     ->orWhere('owner_id', $userId);
    }
}
