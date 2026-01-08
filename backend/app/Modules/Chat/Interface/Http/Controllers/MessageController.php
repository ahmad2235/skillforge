<?php

/**
 * MESSAGE CONTROLLER
 * 
 * PURPOSE: REST API for sending chat messages.
 * 
 * NOTE: This controller is primarily for fallback/testing.
 * In production, messages should be sent via Socket.IO for real-time delivery.
 * This REST endpoint exists for:
 * - Testing without Socket.IO
 * - Fallback if WebSocket connection fails
 * - API consumers who don't need real-time
 * 
 * SYSTEM CONTRACT (NON-NEGOTIABLE):
 * - Messages are append-only
 * - sender_id is ALWAYS from auth, never from client
 * - Conversation ownership verified on every request
 */

namespace App\Modules\Chat\Interface\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Chat\Domain\Models\Conversation;
use App\Modules\Chat\Domain\Models\Message;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class MessageController extends Controller
{
    /**
     * Allowed roles for chat participation.
     */
    private const ALLOWED_ROLES = ['student', 'business'];

    /**
     * POST /api/conversations/{id}/messages
     * 
     * Send a message to a conversation (REST fallback).
     * 
     * REQUEST BODY:
     * {
     *   "message": "Hello!",
     *   "temp_id": "uuid"  // Optional, for client correlation
     * }
     * 
     * WHY temp_id IS OPTIONAL:
     * - REST doesn't need optimistic UI like WebSocket
     * - Client waits for response anyway
     * - Included for API consistency
     * 
     * RETURNS:
     * {
     *   "message": { ... },
     *   "temp_id": "uuid"  // Echoed back if provided
     * }
     */
    public function store(Request $request, int $conversationId): JsonResponse
    {
        $user = $request->user();

        // SECURITY: Verify user has chat access
        if (!$this->canAccessChat($user)) {
            return response()->json([
                'message' => 'Chat access denied. Only students and business owners can use chat.'
            ], 403);
        }

        // Find conversation
        $conversation = Conversation::find($conversationId);

        if (!$conversation) {
            return response()->json([
                'message' => 'Conversation not found.'
            ], 404);
        }

        // SECURITY: Verify user is participant
        if (!$conversation->hasParticipant($user->id)) {
            Log::warning('chat.unauthorized_message_send', [
                'conversation_id' => $conversationId,
                'user_id' => $user->id,
            ]);

            return response()->json([
                'message' => 'You are not a participant in this conversation.'
            ], 403);
        }

        // Validate request
        $validated = $request->validate([
            'message' => 'required|string|max:5000',
            'temp_id' => 'nullable|string|max:100',
        ]);

        // Sanitize message (basic XSS prevention)
        // WHY strip_tags:
        // - Chat is plain text only
        // - No HTML allowed
        // - Additional escaping done at display time
        $messageText = strip_tags(trim($validated['message']));

        if (empty($messageText)) {
            return response()->json([
                'message' => 'Message cannot be empty.'
            ], 422);
        }

        try {
            // Create message
            // WHY sender_id FROM AUTH:
            // - NEVER trust client-sent user IDs
            // - Auth user is the only valid sender
            $message = Message::create([
                'conversation_id' => $conversationId,
                'sender_id' => $user->id,
                'message' => $messageText,
            ]);

            // Touch conversation to update updated_at
            // WHY: Enables sorting conversations by "last message time"
            $conversation->touch();

            Log::info('chat.message_sent', [
                'message_id' => $message->id,
                'conversation_id' => $conversationId,
                'sender_id' => $user->id,
            ]);

            return response()->json([
                'message' => $message->toSocketFormat(),
                'temp_id' => $validated['temp_id'] ?? null,
            ], 201);

        } catch (\Exception $e) {
            Log::error('chat.message_send_failed', [
                'conversation_id' => $conversationId,
                'sender_id' => $user->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Failed to send message. Please try again.',
                'temp_id' => $validated['temp_id'] ?? null,
            ], 500);
        }
    }

    /**
     * Check if a user can access the chat system.
     */
    private function canAccessChat(?User $user): bool
    {
        if (!$user) {
            return false;
        }

        if (isset($user->is_active) && !$user->is_active) {
            return false;
        }

        return in_array($user->role, self::ALLOWED_ROLES, true);
    }
}
