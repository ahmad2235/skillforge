/**
 * CHAT MESSAGE INPUT COMPONENT
 * 
 * PURPOSE: Text input for composing messages with clear feedback.
 * 
 * FEATURES:
 * - Controlled input with real-time character count
 * - Submit on Enter (Shift+Enter for newline)
 * - Disabled state when not connected with helpful message
 * - Character limit 5000 with visual warning at 4000+ chars
 * - Button disabled until valid message is entered
 * - Auto-resizing textarea for better UX
 */

import React, { useState, useRef, useEffect } from 'react';

interface MessageInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
}

export function MessageInput({
  onSend,
  disabled = false,
  placeholder = 'Type your message...',
  maxLength = 5000,
}: MessageInputProps) {
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const charLimit = maxLength;
  const charCount = text.length;
  const isNearLimit = charCount >= charLimit * 0.8;
  const isEmpty = text.trim().length === 0;

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [text]);

  const handleSubmit = async () => {
    if (isEmpty || disabled || isSending) return;

    setIsSending(true);
    try {
      await onSend(text.trim());
      setText('');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
  };

  return (
    <div className="border-t border-slate-800 bg-slate-900/70">
      {/* Input area with feedback */}
      <div className="p-4">
        <div className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, charLimit))}
            onKeyDown={handleKeyDown}
            placeholder={
              disabled ? 'Connecting to chat server...' : placeholder
            }
            disabled={disabled || isSending}
            rows={1}
            className="flex-1 resize-none rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent disabled:bg-slate-900/60 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
          />
          <button
            onClick={handleSubmit}
            disabled={disabled || isEmpty || isSending}
            className={`
              px-4 py-2 rounded-lg font-medium whitespace-nowrap
              transition-all duration-200
              ${
                isSending
                  ? 'bg-sky-400/70 cursor-not-allowed text-slate-950'
                  : isEmpty
                  ? 'bg-slate-700 cursor-not-allowed text-slate-400'
                  : 'bg-sky-500 text-slate-950 hover:bg-sky-400 active:scale-95'
              }
            `}
          >
            {isSending ? (
              <span className="inline-flex items-center gap-1">
                <span className="inline-block animate-spin text-sm">⏳</span>
                <span className="hidden sm:inline text-sm">Sending</span>
              </span>
            ) : (
              'Send'
            )}
          </button>
        </div>
      </div>

      {/* Character count and connection status */}
      <div className="px-4 pb-2 space-y-1">
        {/* Character count indicator */}
        {(isNearLimit || charCount > 0) && (
          <div className="flex items-center justify-between text-xs">
            <div
              className={`${
                isNearLimit ? 'text-amber-300 font-medium' : 'text-slate-400'
              }`}
            >
              {charCount}/{charLimit} characters
            </div>
            {isNearLimit && (
              <div className="text-amber-300 font-medium">⚠️ Approaching limit</div>
            )}
          </div>
        )}

        {/* Connection status */}
        {disabled && (
          <div className="text-xs text-slate-400 flex items-center gap-1">
            <span className="inline-block animate-spin text-xs">⏳</span>
            Waiting for connection...
          </div>
        )}
      </div>
    </div>
  );
}
