<?php

/**
 * CONVERSATION CONTROLLER
 * 
 * PURPOSE: REST API for chat conversations.
 * 
 * SYSTEM CONTRACT (NON-NEGOTIABLE):
 * - Only students and business owners can access chat
 * - student ↔ business allowed
 * - student ↔ student FORBIDDEN
 * - business ↔ business FORBIDDEN
 * - admin has NO chat access
 * - Exactly ONE conversation per student-business pair
 * 
 * ENDPOINTS:
 * - GET  /api/conversations          → List user's conversations
 * - POST /api/conversations          → Create/get conversation with target user
 * - GET  /api/conversations/{id}/messages → Get paginated messages
 * 
 * AUTHORIZATION:
 * - All endpoints require auth:sanctum
 * - All endpoints verify user is participant
 * - Role checks on every request
 */

namespace App\Modules\Chat\Interface\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Chat\Domain\Models\Conversation;
use App\Modules\Chat\Domain\Models\Message;
use App\Modules\Projects\Infrastructure\Models\ProjectAssignment;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ConversationController extends Controller
{
    /**
     * Allowed roles for chat participation.
     * 
     * WHY CONSTANT:
     * - Single source of truth for role checks
     * - Easy to audit and modify
     * - admin explicitly excluded
     */
    private const ALLOWED_ROLES = ['student', 'business'];

    /**
     * Assignment statuses that should automatically surface a chat.
     */
    private const ASSIGNMENT_CHAT_STATUSES = ['invited', 'accepted'];

    /**
     * GET /api/conversations
     * 
     * List all conversations for the authenticated user.
     * 
     * WHY EAGER LOAD student AND owner:
     * - Frontend needs names/emails for conversation list
     * - Avoids N+1 query problem
     * - Single query with JOINs
     * 
     * RETURNS:
     * {
     *   "conversations": [
     *     {
     *       "id": 1,
     *       "student": { "id": 2, "name": "...", "email": "..." },
     *       "owner": { "id": 3, "name": "...", "email": "..." },
     *       "created_at": "..."
     *     }
     *   ]
     * }
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        // SECURITY: Verify user has chat access
        if (!$this->canAccessChat($user)) {
            return response()->json([
                'message' => 'Chat access denied. Only students and business owners can use chat.'
            ], 403);
        }

        // Ensure invited/accepted project pairs have a conversation record
        $this->ensureAssignmentConversations($user);

        // Fetch conversations where user is either student or owner
        $conversations = Conversation::forUser($user->id)
            ->with(['student:id,name,email', 'owner:id,name,email'])
            ->orderBy('updated_at', 'desc')
            ->get();

        return response()->json([
            'conversations' => $conversations,
        ]);
    }

    /**
     * POST /api/conversations
     * 
     * Create a new conversation or return existing one.
     * 
     * REQUEST BODY:
     * {
     *   "target_user_id": 123  // The other participant
     * }
     * 
     * WHY getOrCreate PATTERN:
     * - Prevents duplicate conversations
     * - Race condition safe (DB unique constraint)
     * - Client doesn't need to check if conversation exists
     * 
     * ROLE ENFORCEMENT:
     * - If requester is student, target must be business
     * - If requester is business, target must be student
     * - Any other combination is rejected
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        // SECURITY: Verify user has chat access
        if (!$this->canAccessChat($user)) {
            return response()->json([
                'message' => 'Chat access denied. Only students and business owners can use chat.'
            ], 403);
        }

        // Validate request
        $validated = $request->validate([
            'target_user_id' => 'required|integer|exists:users,id',
        ]);

        $targetUserId = $validated['target_user_id'];

        // SECURITY: Cannot chat with yourself
        if ($user->id === $targetUserId) {
            return response()->json([
                'message' => 'Cannot create conversation with yourself.'
            ], 422);
        }

        // Fetch target user
        $targetUser = User::find($targetUserId);

        // SECURITY: Verify target user has chat access
        if (!$this->canAccessChat($targetUser)) {
            return response()->json([
                'message' => 'Target user cannot participate in chat.'
            ], 422);
        }

        // SECURITY: Enforce student ↔ business rule
        // Determine who is student and who is business
        $studentId = null;
        $ownerId = null;

        if ($user->role === 'student' && $targetUser->role === 'business') {
            $studentId = $user->id;
            $ownerId = $targetUser->id;
        } elseif ($user->role === 'business' && $targetUser->role === 'student') {
            $studentId = $targetUser->id;
            $ownerId = $user->id;
        } else {
            // student ↔ student or business ↔ business
            return response()->json([
                'message' => 'Chat is only allowed between students and business owners.'
            ], 422);
        }

        // Create or get existing conversation
        // WHY firstOrCreate:
        // - Atomic operation with DB unique constraint
        // - Race condition safe
        // - Returns existing if duplicate attempted
        try {
            $conversation = Conversation::firstOrCreate(
                [
                    'student_id' => $studentId,
                    'owner_id' => $ownerId,
                ],
                [] // No additional attributes on create
            );

            // Eager load participants for response
            $conversation->load(['student:id,name,email', 'owner:id,name,email']);

            // Log for audit
            Log::info('chat.conversation_accessed', [
                'conversation_id' => $conversation->id,
                'user_id' => $user->id,
                'target_user_id' => $targetUserId,
                'was_created' => $conversation->wasRecentlyCreated,
            ]);

            return response()->json([
                'conversation' => $conversation,
                'created' => $conversation->wasRecentlyCreated,
            ], $conversation->wasRecentlyCreated ? 201 : 200);

        } catch (\Exception $e) {
            Log::error('chat.conversation_create_failed', [
                'user_id' => $user->id,
                'target_user_id' => $targetUserId,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Failed to create conversation. Please try again.'
            ], 500);
        }
    }

    /**
     * GET /api/conversations/{id}/messages
     * 
     * Get paginated messages for a conversation.
     * 
     * QUERY PARAMS:
     * - page: int (default 1)
     * - limit: int (default 30, max 50)
     * 
     * WHY PAGINATION:
     * - Prevents loading entire message history
     * - Reduces memory usage on client and server
     * - Enables infinite scroll UX
     * 
     * WHY ORDER BY created_at DESC:
     * - Most recent messages first
     * - Client reverses for display (oldest at top)
     * - Efficient for "load more" UX
     */
    public function messages(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        // SECURITY: Verify user has chat access
        if (!$this->canAccessChat($user)) {
            return response()->json([
                'message' => 'Chat access denied. Only students and business owners can use chat.'
            ], 403);
        }

        // Find conversation
        $conversation = Conversation::find($id);

        if (!$conversation) {
            return response()->json([
                'message' => 'Conversation not found.'
            ], 404);
        }

        // SECURITY: Verify user is participant
        if (!$conversation->hasParticipant($user->id)) {
            Log::warning('chat.unauthorized_message_access', [
                'conversation_id' => $id,
                'user_id' => $user->id,
            ]);

            return response()->json([
                'message' => 'You are not a participant in this conversation.'
            ], 403);
        }

        // Validate pagination params
        $validated = $request->validate([
            'page' => 'integer|min:1',
            'limit' => 'integer|min:1|max:50',
        ]);

        $page = $validated['page'] ?? 1;
        $limit = $validated['limit'] ?? 30;

        // Fetch paginated messages (newest first)
        $messages = Message::where('conversation_id', $id)
            ->orderBy('created_at', 'desc')
            ->paginate($limit, ['*'], 'page', $page);

        return response()->json([
            'messages' => $messages->items(),
            'pagination' => [
                'current_page' => $messages->currentPage(),
                'last_page' => $messages->lastPage(),
                'per_page' => $messages->perPage(),
                'total' => $messages->total(),
            ],
        ]);
    }

    /**
     * Check if a user can access the chat system.
     * 
     * WHY SEPARATE METHOD:
     * - Single point of truth for authorization
     * - Easy to modify if roles change
     * - Clear audit trail
     */
    private function canAccessChat(?User $user): bool
    {
        if (!$user) {
            return false;
        }

        // User must be active
        if (isset($user->is_active) && !$user->is_active) {
            return false;
        }

        // User must have allowed role
        return in_array($user->role, self::ALLOWED_ROLES, true);
    }

    /**
     * Auto-create conversations for active project invitations so invited pairs appear in chat lists.
     */
    private function ensureAssignmentConversations(User $user): void
    {
        $statuses = self::ASSIGNMENT_CHAT_STATUSES;

        if ($user->role === 'student') {
            $ownerIds = ProjectAssignment::query()
                ->join('projects', 'projects.id', '=', 'project_assignments.project_id')
                ->where('project_assignments.user_id', $user->id)
                ->whereIn('project_assignments.status', $statuses)
                ->whereNotNull('projects.owner_id')
                ->pluck('projects.owner_id')
                ->unique();

            foreach ($ownerIds as $ownerId) {
                Conversation::firstOrCreate([
                    'student_id' => $user->id,
                    'owner_id' => $ownerId,
                ]);
            }
        }

        if ($user->role === 'business') {
            $studentIds = ProjectAssignment::query()
                ->join('projects', 'projects.id', '=', 'project_assignments.project_id')
                ->where('projects.owner_id', $user->id)
                ->whereIn('project_assignments.status', $statuses)
                ->pluck('project_assignments.user_id')
                ->unique();

            foreach ($studentIds as $studentId) {
                Conversation::firstOrCreate([
                    'student_id' => $studentId,
                    'owner_id' => $user->id,
                ]);
            }
        }
    }
}
