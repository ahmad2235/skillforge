/**
 * CHAT TYPES
 * 
 * Shared type definitions for the chat system.
 */

export interface ChatUser {
  id: number;
  name: string;
  email: string;
}

export interface ChatConversation {
  id: number;
  student_id: number;
  owner_id: number;
  student: ChatUser;
  owner: ChatUser;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: number;
  conversationId: number;
  senderId: number;
  text: string;
  createdAt: string;
  tempId?: string;
  /** Status for optimistic UI */
  status?: 'sending' | 'sent' | 'failed';
}

export interface ChatError {
  tempId?: string;
  reason: string;
}

export interface ChatPagination {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}
