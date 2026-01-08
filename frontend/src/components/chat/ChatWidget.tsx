/**
 * CHAT WIDGET COMPONENT
 * 
 * PURPOSE: Main chat interface combining all chat components.
 * 
 * SYSTEM CONTRACT:
 * - Only students and business owners can use chat
 * - Messages sent via Socket.IO for real-time delivery
 * - Messages persisted to database (authoritative)
 * - Optimistic UI with tempId reconciliation
 * 
 * FEATURES:
 * - Conversation list sidebar
 * - Message list with pagination
 * - Real-time message delivery
 * - Connection status indicator
 * - Error handling
 */

import React, { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '../../hooks/useAuth';
import { useChatSocket, ChatMessage as SocketMessage } from '../../hooks/useChatSocket';
import { getConversations, getMessages, createConversation } from '../../services/chatService';
import { ChatConversation, ChatMessage, ChatError } from '../../types/chat';
import { ConversationList } from './ConversationList';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';

export function ChatWidget() {
  const { user, token, isAuthenticated } = useAuth();

  // State
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);

  /**
   * Handle incoming message from Socket.IO.
   * 
   * RECONCILIATION LOGIC:
   * - If message has tempId that matches a sending message, replace it
   * - Otherwise, add as new message
   * - This handles both own messages (confirmation) and received messages
   */
  const handleIncomingMessage = useCallback((message: SocketMessage) => {
    setMessages((prev) => {
      // Check if this is a confirmation of our own message
      if (message.tempId) {
        const existingIndex = prev.findIndex((m) => m.tempId === message.tempId);
        if (existingIndex !== -1) {
          // Replace optimistic message with confirmed one
          const updated = [...prev];
          updated[existingIndex] = {
            ...message,
            status: 'sent',
          };
          return updated;
        }
      }

      // Check if message already exists (duplicate prevention)
      if (prev.some((m) => m.id === message.id)) {
        return prev;
      }

      // New message - only add if it's for the current conversation
      if (selectedConversation && message.conversationId === selectedConversation.id) {
        return [...prev, { ...message, status: 'sent' }];
      }

      return prev;
    });
  }, [selectedConversation]);

  /**
   * Handle error from Socket.IO.
   * 
   * Mark message as failed so user can see and retry.
   */
  const handleError = useCallback((error: ChatError) => {
    if (error.tempId) {
      setMessages((prev) =>
        prev.map((m) =>
          m.tempId === error.tempId ? { ...m, status: 'failed' } : m
        )
      );
    }
    setError(error.reason);
    // Clear error after 5 seconds
    setTimeout(() => setError(null), 5000);
  }, []);

  // Socket connection
  const { isConnected, sendMessage } = useChatSocket({
    onMessage: handleIncomingMessage,
    onError: handleError,
  });

  /**
   * Load conversations on mount.
   */
  useEffect(() => {
    if (!isAuthenticated || !token) return;

    // Check if user can access chat
    if (user?.role !== 'student' && user?.role !== 'business') {
      setError('Chat is only available for students and business owners.');
      setLoading(false);
      return;
    }

    const loadConversations = async () => {
      try {
        const data = await getConversations(token);
        setConversations(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load conversations');
      } finally {
        setLoading(false);
      }
    };

    loadConversations();
  }, [isAuthenticated, token, user?.role]);

  /**
   * Load messages when conversation is selected.
   */
  useEffect(() => {
    if (!selectedConversation || !token) {
      setMessages([]);
      return;
    }

    const loadMessages = async () => {
      setMessagesLoading(true);
      try {
        const { messages: data, pagination } = await getMessages(
          token,
          selectedConversation.id,
          1,
          30
        );
        // Reverse to show oldest first
        setMessages(data.reverse().map((m) => ({ ...m, status: 'sent' as const })));
        setCurrentPage(1);
        setHasMoreMessages(pagination.current_page < pagination.last_page);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load messages');
      } finally {
        setMessagesLoading(false);
      }
    };

    loadMessages();
  }, [selectedConversation, token]);

  /**
   * Load more messages (pagination).
   */
  const handleLoadMore = async () => {
    if (!selectedConversation || !token || messagesLoading) return;

    setMessagesLoading(true);
    try {
      const nextPage = currentPage + 1;
      const { messages: data, pagination } = await getMessages(
        token,
        selectedConversation.id,
        nextPage,
        30
      );
      // Prepend older messages (reversed)
      setMessages((prev) => [
        ...data.reverse().map((m) => ({ ...m, status: 'sent' as const })),
        ...prev,
      ]);
      setCurrentPage(nextPage);
      setHasMoreMessages(pagination.current_page < pagination.last_page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more messages');
    } finally {
      setMessagesLoading(false);
    }
  };

  /**
   * Send a message.
   * 
   * OPTIMISTIC UI:
   * 1. Generate tempId
   * 2. Add message to list immediately (status: sending)
   * 3. Send via Socket.IO
   * 4. On receive_message, update status to sent
   * 5. On error, update status to failed
   */
  const handleSendMessage = (text: string) => {
    if (!selectedConversation || !user) return;

    const tempId = uuidv4();

    // Optimistic update
    const optimisticMessage: ChatMessage = {
      id: -1, // Placeholder, will be replaced
      conversationId: selectedConversation.id,
      senderId: user.id,
      text,
      createdAt: new Date().toISOString(),
      tempId,
      status: 'sending',
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    // Send via Socket.IO
    sendMessage(selectedConversation.id, text, tempId);
  };

  /**
   * Select a conversation.
   */
  const handleSelectConversation = (conversation: ChatConversation) => {
    setSelectedConversation(conversation);
    setError(null);
  };

  // Access denied for non-chat users
  if (user && user.role !== 'student' && user.role !== 'business') {
    return (
      <div className="h-full flex items-center justify-center bg-slate-900/80 rounded-xl border border-slate-800">
        <div className="text-center p-8 text-slate-100">
          <h2 className="text-xl font-semibold text-slate-100 mb-2">
            Chat Not Available
          </h2>
          <p className="text-slate-400">
            Chat is only available for students and business owners.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl shadow-slate-950/30 overflow-hidden">
      {/* Sidebar - Conversation List */}
      <div className="w-80 border-r border-slate-800 flex flex-col bg-slate-950/60">
        <div className="p-4 border-b border-slate-800">
          <h2 className="font-semibold text-slate-100">Messages</h2>
          {/* Connection status */}
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span className="text-xs text-slate-400">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <ConversationList
            conversations={conversations}
            selectedId={selectedConversation?.id ?? null}
            onSelect={handleSelectConversation}
            loading={loading}
          />
        </div>
      </div>

      {/* Main - Message Area */}
      <div className="flex-1 flex flex-col bg-slate-900/60">
        {selectedConversation ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-slate-800 bg-slate-900/70">
              <h3 className="font-semibold text-slate-100">
                {user?.id === selectedConversation.student_id
                  ? selectedConversation.owner.name
                  : selectedConversation.student.name}
              </h3>
              <p className="text-sm text-slate-400">
                {user?.id === selectedConversation.student_id
                  ? selectedConversation.owner.email
                  : selectedConversation.student.email}
              </p>
            </div>

            {/* Error banner */}
            {error && (
              <div className="px-4 py-2 bg-red-500/10 text-red-200 text-sm border-b border-red-500/30">
                {error}
              </div>
            )}

            {/* Messages */}
            <MessageList
              messages={messages}
              loading={messagesLoading}
              hasMore={hasMoreMessages}
              onLoadMore={handleLoadMore}
              otherUserName={
                user?.id === selectedConversation.student_id
                  ? selectedConversation.owner.name
                  : selectedConversation.student.name
              }
            />

            {/* Input */}
            <MessageInput
              onSend={handleSendMessage}
              disabled={!isConnected}
              placeholder={
                isConnected
                  ? 'Type a message...'
                  : 'Connecting to chat server...'
              }
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-slate-950 to-slate-900">
            <div className="text-center p-8 max-w-xs text-slate-100">
              <div className="text-5xl mb-4">💬</div>
              <h3 className="text-lg font-semibold text-slate-100 mb-2">
                Welcome to Chat
              </h3>
              <p className="text-sm text-slate-400 mb-6">
                Select a conversation from the list to start messaging
              </p>
              {conversations.length === 0 && !loading && (
                <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-3 text-sm text-slate-200">
                  <p className="font-medium mb-1 text-slate-100">No conversations yet</p>
                  <p className="text-slate-300">
                    {user?.role === 'student'
                      ? 'Start chatting with a business owner to create a conversation.'
                      : 'Start chatting with a student to create a conversation.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
