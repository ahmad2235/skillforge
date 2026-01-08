/**
 * CHAT SERVICE - API CLIENT
 * 
 * PURPOSE: HTTP client for chat REST API endpoints.
 * 
 * SYSTEM CONTRACT:
 * - All requests use Sanctum Bearer token from auth context
 * - Conversation creation is idempotent (returns existing if duplicate)
 * - Messages are paginated (default 30 per page)
 * 
 * ENDPOINTS:
 * - GET  /api/chat/conversations
 * - POST /api/chat/conversations
 * - GET  /api/chat/conversations/{id}/messages
 * - POST /api/chat/conversations/{id}/messages (fallback)
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface Conversation {
  id: number;
  student_id: number;
  owner_id: number;
  student: {
    id: number;
    name: string;
    email: string;
  };
  owner: {
    id: number;
    name: string;
    email: string;
  };
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: number;
  conversationId: number;
  senderId: number;
  text: string;
  createdAt: string;
  tempId?: string;
}

export interface PaginationInfo {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

/**
 * Fetch all conversations for the authenticated user.
 */
export async function getConversations(token: string): Promise<Conversation[]> {
  const response = await fetch(`${API_BASE}/api/chat/conversations`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to fetch conversations');
  }

  const data = await response.json();
  return data.conversations;
}

/**
 * Create a new conversation or get existing one.
 * 
 * WHY targetUserId:
 * - Client specifies WHO to chat with
 * - Server determines student vs business roles
 * - Returns existing conversation if already exists
 */
export async function createConversation(
  token: string,
  targetUserId: number
): Promise<{ conversation: Conversation; created: boolean }> {
  const response = await fetch(`${API_BASE}/api/chat/conversations`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ target_user_id: targetUserId }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to create conversation');
  }

  return response.json();
}

/**
 * Fetch paginated messages for a conversation.
 * 
 * WHY reverse:
 * - API returns newest first (for efficient pagination)
 * - UI displays oldest first (chronological)
 * - Client reverses for display
 */
export async function getMessages(
  token: string,
  conversationId: number,
  page: number = 1,
  limit: number = 30
): Promise<{ messages: Message[]; pagination: PaginationInfo }> {
  const url = new URL(`${API_BASE}/api/chat/conversations/${conversationId}/messages`);
  url.searchParams.set('page', page.toString());
  url.searchParams.set('limit', limit.toString());

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to fetch messages');
  }

  const data = await response.json();
  
  // Transform API response to Message interface
  // API returns snake_case, we use camelCase
  const messages: Message[] = data.messages.map((msg: Record<string, unknown>) => ({
    id: msg.id,
    conversationId: msg.conversation_id,
    senderId: msg.sender_id,
    text: msg.message,
    createdAt: msg.created_at,
  }));

  return {
    messages,
    pagination: data.pagination,
  };
}

/**
 * Send a message via REST API (fallback when Socket.IO unavailable).
 * 
 * PREFER Socket.IO for real-time delivery.
 * Use this only if WebSocket connection fails.
 */
export async function sendMessageRest(
  token: string,
  conversationId: number,
  text: string,
  tempId?: string
): Promise<Message> {
  const response = await fetch(
    `${API_BASE}/api/chat/conversations/${conversationId}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ message: text, temp_id: tempId }),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to send message');
  }

  const data = await response.json();
  return data.message;
}
