/**
 * CHAT MESSAGE COMPONENT
 * 
 * PURPOSE: Display a single chat message with clear sender awareness.
 * 
 * FEATURES:
 * - Different styling for sent (right/blue) vs received (left/gray)
 * - Sender name displayed for received messages
 * - Status indicator for message delivery state (sending/sent/failed)
 * - Subtle fade-in animation for new messages
 * - Visual distinction between message states
 */

import React from 'react';
import { ChatMessage } from '../../types/chat';
import { useAuth } from '../../hooks/useAuth';

interface MessageBubbleProps {
  message: ChatMessage;
  senderName?: string; // Name of message sender (for received messages only)
}

export function MessageBubble({ message, senderName }: MessageBubbleProps) {
  const { user } = useAuth();
  const isSent = user?.id === message.senderId;

  // Format timestamp
  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Visual state based on delivery status
  const isLoading = message.status === 'sending';
  const isFailed = message.status === 'failed';

  return (
    // Flex container with animation for new messages
    <div className={`flex ${isSent ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className="flex flex-col max-w-[70%]">
        {/* Sender name (for received messages to clarify who is speaking) */}
        {!isSent && senderName && (
          <div className="text-xs font-semibold text-slate-400 mb-1 px-1">
            {senderName}
          </div>
        )}

        {/* Message bubble with state-based styling */}
        <div
          className={`rounded-lg px-4 py-2 transition-all duration-200 ${
            isSent
              ? 'bg-sky-600 text-slate-50 rounded-br-none shadow-lg shadow-slate-950/30'
              : 'bg-slate-800 text-slate-100 rounded-bl-none shadow-md shadow-slate-950/20'
          } ${
            isLoading ? 'opacity-70' : 'opacity-100'
          } ${
            isFailed ? 'border-2 border-red-400 bg-red-900/30 text-red-100' : ''
          }`}
        >
          {/* Message text */}
          <p className={`whitespace-pre-wrap break-words text-sm font-medium ${
            isSent ? 'text-slate-50' : ''
          }`}>{message.text}</p>

          {/* Timestamp and status indicators */}
          <div
            className={`text-xs mt-1 flex items-center justify-between gap-2 ${
              isSent ? 'text-slate-200' : 'text-slate-400'
            } ${
              isFailed ? 'text-red-300' : ''
            }`}
          >
            <span>{time}</span>

            {/* Status icon for sent messages */}
            {isSent && message.status && (
              <span className="inline-flex items-center">
                {message.status === 'sending' && (
                  <span className="inline-block animate-spin text-base">⏳</span>
                )}
                {message.status === 'sent' && (
                  <span className="text-green-300 text-base">✓</span>
                )}
                {message.status === 'failed' && (
                  <span className="text-red-500 font-bold">✕</span>
                )}
              </span>
            )}
          </div>
        </div>

        {/* Error hint for failed messages */}
        {isFailed && (
          <div className="text-xs text-red-600 mt-1 px-1 font-medium">
            Message failed. Retry by resending.
          </div>
        )}
      </div>
    </div>
  );
}
