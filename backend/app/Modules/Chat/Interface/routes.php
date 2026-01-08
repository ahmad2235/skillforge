<?php

/**
 * CHAT MODULE ROUTES
 * 
 * PURPOSE: Define REST API endpoints for the chat system.
 * 
 * SYSTEM CONTRACT (NON-NEGOTIABLE):
 * - All routes require auth:sanctum
 * - All routes are rate-limited
 * - Only students and business owners can access
 * - admin has NO chat access (enforced at controller level)
 * 
 * ENDPOINTS:
 * - GET  /api/chat/conversations              → List user's conversations
 * - POST /api/chat/conversations              → Create/get conversation
 * - GET  /api/chat/conversations/{id}/messages → Get paginated messages
 * - POST /api/chat/conversations/{id}/messages → Send message (REST fallback)
 * 
 * WHY /api/chat PREFIX:
 * - Clear separation from other modules
 * - Easy to identify chat-related requests in logs
 * - Matches module naming convention
 */

use Illuminate\Support\Facades\Route;
use App\Modules\Chat\Interface\Http\Controllers\ConversationController;
use App\Modules\Chat\Interface\Http\Controllers\MessageController;

/*
 | ------------------------------------------------------------------
 | Chat Module Routes
 | ------------------------------------------------------------------
 | Real-time chat between students and business owners.
 | 
 | NOTE: Real-time messaging goes through Socket.IO, not REST.
 | These endpoints are for:
 | - Listing conversations
 | - Creating conversations
 | - Loading message history
 | - REST fallback for sending (when Socket.IO unavailable)
 */

Route::prefix('chat')
    ->middleware(['auth:sanctum', 'throttle:60,1']) // 60 requests per minute
    ->group(function () {
        
        // GET /api/chat/conversations
        // List all conversations for authenticated user
        Route::get('conversations', [ConversationController::class, 'index']);
        
        // POST /api/chat/conversations
        // Create new conversation or get existing one
        // Body: { "target_user_id": 123 }
        Route::post('conversations', [ConversationController::class, 'store']);
        
        // GET /api/chat/conversations/{id}/messages
        // Get paginated messages for a conversation
        // Query: ?page=1&limit=30
        Route::get('conversations/{id}/messages', [ConversationController::class, 'messages'])
            ->where('id', '[0-9]+');
        
        // POST /api/chat/conversations/{id}/messages
        // Send a message (REST fallback, prefer Socket.IO)
        // Body: { "message": "Hello!", "temp_id": "uuid" }
        Route::post('conversations/{id}/messages', [MessageController::class, 'store'])
            ->where('id', '[0-9]+');
    });
