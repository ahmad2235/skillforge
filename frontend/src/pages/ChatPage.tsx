/**
 * CHAT PAGE
 * 
 * PURPOSE: Dedicated page for chat functionality.
 * 
 * ROUTE: /chat
 * 
 * ACCESS:
 * - Students: Can chat with business owners
 * - Business owners: Can chat with students
 * - Admin: Access denied
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ChatWidget } from '../components/chat';

export function ChatPage() {
  const { user, isAuthenticated, initialized } = useAuth();

  // Wait for auth initialization
  if (!initialized) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Only students and business owners can access chat
  if (user?.role !== 'student' && user?.role !== 'business') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 p-4 sm:p-6 text-slate-100">
      <div className="mx-auto flex h-[calc(100vh-96px)] max-w-6xl flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Messages</h1>
        </div>
        <div className="flex-1 rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl shadow-slate-950/30 p-2 sm:p-4">
          <ChatWidget />
        </div>
      </div>
    </div>
  );
}

export default ChatPage;
