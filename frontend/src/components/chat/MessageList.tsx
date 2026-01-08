/**
 * CHAT MESSAGE LIST COMPONENT
 * 
 * PURPOSE: Display scrollable list of messages with smart auto-scroll.
 * 
 * FEATURES:
 * - Auto-scroll to bottom only when user is near bottom (improves readability when scrolling up)
 * - Load more button for pagination
 * - Empty state with helpful messaging
 * - Message limit indicator (100+ messages)
 * - Padding and spacing for comfortable reading
 */

import React, { useRef, useEffect, useState } from 'react';
import { ChatMessage } from '../../types/chat';
import { MessageBubble } from './MessageBubble';
import { useAuth } from '../../hooks/useAuth';

interface MessageListProps {
  messages: ChatMessage[];
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  otherUserName?: string; // Name of conversation partner for sender labels
}

export function MessageList({
  messages,
  loading = false,
  hasMore = false,
  onLoadMore,
  otherUserName,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  // Smart auto-scroll: only scroll if user is within 100px of bottom
  // WHY: Prevents jumping when user is reading older messages
  useEffect(() => {
    if (!containerRef.current || !shouldAutoScroll) return;

    const container = containerRef.current;
    const isNearBottom = 
      container.scrollHeight - container.scrollTop - container.clientHeight < 100;

    if (isNearBottom && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, shouldAutoScroll]);

  // Handle scroll to detect if user is near bottom
  const handleScroll = () => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const isNearBottom = 
      container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    setShouldAutoScroll(isNearBottom);
  };

  // Empty state
  if (messages.length === 0 && !loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-slate-950 to-slate-900">
        <div className="text-center p-8 max-w-xs text-slate-100">
          <div className="text-4xl mb-3">💬</div>
          <h3 className="text-lg font-semibold text-slate-100 mb-2">
            Start the conversation
          </h3>
          <p className="text-sm text-slate-400">
            No messages yet. Say hello to{' '}
            <span className="font-medium text-slate-100">{otherUserName || 'this user'}</span>{' '}
            to get things started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto p-4 space-y-1 bg-slate-900/40"
    >
      {/* Load older messages button */}
      {hasMore && (
        <div className="text-center py-4">
          <button
            onClick={onLoadMore}
            disabled={loading}
            className="text-sm text-sky-300 hover:text-sky-200 font-medium disabled:text-slate-600 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="inline-block animate-spin">⏳</span>
                Loading older messages...
              </span>
            ) : (
              '↑ Load older messages'
            )}
          </button>
        </div>
      )}

      {/* Message list */}
      {messages.map((message) => {
        const { user } = useAuth();
        const isFromOther = message.senderId !== user?.id;
        return (
          <MessageBubble
            key={message.tempId || message.id}
            message={message}
            senderName={isFromOther ? otherUserName : undefined}
          />
        );
      })}

      {/* Message count indicator (warn when approaching limit) */}
      {messages.length >= 95 && (
        <div className="py-3 px-2 text-center">
          <div className="inline-block bg-amber-500/10 border border-amber-500/40 rounded px-3 py-2 text-xs text-amber-200">
            <span className="font-semibold text-amber-100">{messages.length}</span> messages 
            {messages.length >= 100 && ' — Limit reached, older messages will auto-remove'}
          </div>
        </div>
      )}

      {/* Scroll anchor */}
      <div ref={bottomRef} />
    </div>
  );
}
