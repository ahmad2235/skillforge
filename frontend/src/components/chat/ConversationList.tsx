/**
 * CHAT CONVERSATION LIST COMPONENT
 * 
 * PURPOSE: Display list of user's conversations.
 * 
 * FEATURES:
 * - Lists all conversations for authenticated user
 * - Shows other participant's name
 * - Highlights selected conversation
 * - Click to select conversation
 */

import React from 'react';
import { ChatConversation } from '../../types/chat';
import { useAuth } from '../../hooks/useAuth';

interface ConversationListProps {
  conversations: ChatConversation[];
  selectedId: number | null;
  onSelect: (conversation: ChatConversation) => void;
  loading?: boolean;
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  loading = false,
}: ConversationListProps) {
  const { user } = useAuth();
  const [visibleCount, setVisibleCount] = React.useState(10); // client-side pagination
  const perPage = 10;

  if (loading) {
    return (
      <div className="p-4 text-center text-slate-400">Loading conversations...</div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="p-4 text-center text-slate-400">
        No conversations yet.
        <br />
        <span className="text-sm text-slate-300">
          {user?.role === 'student'
            ? 'Start chatting with a business owner!'
            : 'Start chatting with a student!'}
        </span>
      </div>
    );
  }

  const visible = conversations.slice(0, visibleCount);

  return (
    <div>
      <div className="divide-y divide-slate-800">
        {visible.map((conversation) => {
          // Determine the other participant
          const otherUser =
            user?.id === conversation.student_id
              ? conversation.owner
              : conversation.student;

          const isSelected = selectedId === conversation.id;

          return (
            <button
              key={conversation.id}
              onClick={() => onSelect(conversation)}
              className={`w-full p-4 text-left transition-colors ${
                isSelected ? 'bg-sky-500/10 border-l-4 border-sky-500' : 'hover:bg-slate-800'
              }`}
            >
              <div className="font-medium text-slate-100">{otherUser.name}</div>
              <div className="text-sm text-slate-400 truncate">{otherUser.email}</div>
            </button>
          );
        })}
      </div>

      {visibleCount < conversations.length && (
        <div className="p-3 text-center">
          <button
            onClick={() => setVisibleCount((c) => c + perPage)}
            className="text-sm text-sky-300 hover:text-sky-200 font-medium transition-colors"
          >
            Show more conversations ({conversations.length - visibleCount} more)
          </button>
        </div>
      )}
    </div>
  );
}
