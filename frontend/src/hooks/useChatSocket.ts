/**
 * CHAT SOCKET HOOK
 * 
 * PURPOSE: Manage Socket.IO connection for real-time chat.
 * 
 * SYSTEM CONTRACT (NON-NEGOTIABLE):
 * - ONE socket per session (reused across pages)
 * - Authenticate ONCE on connect with Sanctum token
 * - Close socket on logout
 * - User identity attached to socket, not sent per message
 * 
 * LIFECYCLE:
 * 1. Hook mounts → connect if authenticated
 * 2. Send message → emit send_message with tempId
 * 3. Receive message → call onMessage callback
 * 4. Error → call onError callback
 * 5. Unmount or logout → disconnect
 * 
 * WHY SINGLETON:
 * - Prevents multiple sockets per tab
 * - Reuses connection across route changes
 * - Clean disconnect on logout
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './useAuth';

const SOCKET_URL = import.meta.env.VITE_CHAT_SOCKET_URL || 'http://localhost:3001';

export interface ChatMessage {
  id: number;
  conversationId: number;
  senderId: number;
  text: string;
  createdAt: string;
  tempId?: string;
}

export interface ChatError {
  tempId?: string;
  reason: string;
}

interface UseChatSocketOptions {
  onMessage?: (message: ChatMessage) => void;
  onError?: (error: ChatError) => void;
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
}

interface UseChatSocketReturn {
  isConnected: boolean;
  sendMessage: (conversationId: number, text: string, tempId: string) => void;
  disconnect: () => void;
}

// Singleton socket instance
// WHY: Prevents multiple sockets per tab
let globalSocket: Socket | null = null;

export function useChatSocket(options: UseChatSocketOptions = {}): UseChatSocketReturn {
  const { token, isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const optionsRef = useRef(options);
  
  // Keep options ref up to date
  optionsRef.current = options;

  /**
   * Connect to Socket.IO server.
   * 
   * WHY query.token:
   * - Sanctum token passed via query param
   * - Server validates on connection
   * - No per-message authentication needed
   */
  useEffect(() => {
    if (!isAuthenticated || !token) {
      // Not authenticated, disconnect if connected
      if (globalSocket) {
        globalSocket.disconnect();
        globalSocket = null;
        setIsConnected(false);
      }
      return;
    }

    // Already connected with same token
    if (globalSocket?.connected) {
      setIsConnected(true);
      return;
    }

    // Create new connection
    console.log('[CHAT] Connecting to socket server...');
    
    globalSocket = io(SOCKET_URL, {
      query: { token },
      transports: ['websocket'], // Force WebSocket, skip polling
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // Connection handlers
    globalSocket.on('connect', () => {
      console.log('[CHAT] Connected');
      setIsConnected(true);
      optionsRef.current.onConnect?.();
    });

    globalSocket.on('disconnect', (reason: string) => {
      console.log('[CHAT] Disconnected:', reason);
      setIsConnected(false);
      optionsRef.current.onDisconnect?.(reason);
    });

    globalSocket.on('connect_error', (error: Error) => {
      console.error('[CHAT] Connection error:', error.message);
      setIsConnected(false);
    });

    // Message handlers
    globalSocket.on('receive_message', (message: ChatMessage) => {
      console.log('[CHAT] Received message:', message.id);
      optionsRef.current.onMessage?.(message);
    });

    globalSocket.on('error', (error: ChatError) => {
      console.error('[CHAT] Error:', error.reason);
      optionsRef.current.onError?.(error);
    });

    // Cleanup on unmount
    return () => {
      // Don't disconnect on unmount - keep connection for other components
      // Socket will be disconnected on logout via disconnect() call
    };
  }, [token, isAuthenticated]);

  /**
   * Send a message via Socket.IO.
   * 
   * MESSAGE LIFECYCLE:
   * 1. Client generates tempId (for optimistic UI)
   * 2. Client renders message immediately
   * 3. Client sends to server
   * 4. Server validates & persists
   * 5. Server emits to both users
   * 6. Client replaces tempId with DB id
   */
  const sendMessage = useCallback(
    (conversationId: number, text: string, tempId: string) => {
      if (!globalSocket?.connected) {
        console.error('[CHAT] Cannot send message: not connected');
        options.onError?.({
          tempId,
          reason: 'Not connected to chat server',
        });
        return;
      }

      console.log('[CHAT] Sending message:', tempId);
      
      globalSocket.emit('send_message', {
        tempId,
        conversationId,
        text,
      });
    },
    [options]
  );

  /**
   * Disconnect from Socket.IO server.
   * 
   * WHY explicit disconnect:
   * - Called on logout
   * - Prevents stale connections
   * - Clears singleton
   */
  const disconnect = useCallback(() => {
    if (globalSocket) {
      console.log('[CHAT] Disconnecting...');
      globalSocket.disconnect();
      globalSocket = null;
      setIsConnected(false);
    }
  }, []);

  return {
    isConnected,
    sendMessage,
    disconnect,
  };
}
