'use client';

import { useEffect } from 'react';
import type { Message } from './types';

interface Session {
  user?: { id?: string; name?: string | null; email?: string | null } | null;
}

interface UseConversationSocketOptions {
  session: Session | null;
  conversationId: string | null;
  onNewConversation: (convo: any) => void;
  onConversationMessage: (msg: Message, cid: string) => void;
  onRefreshConversations: () => void;
}

/** Socket.IO hook for realtime conversation-level updates (creation + messages). */
export function useConversationSocket({
  session,
  conversationId,
  onNewConversation,
  onConversationMessage,
  onRefreshConversations,
}: UseConversationSocketOptions) {
  useEffect(() => {
    if (!session?.user) return;
    let socket: any = null;

    const setup = async () => {
      try {
        const { io } = await import('socket.io-client');
        const url = process.env.NEXT_PUBLIC_SOCKET_URL;
        if (!url || !session?.user?.id) return;
        socket = io(url, { transports: ['websocket'], reconnectionAttempts: 3 });

        socket.on('connect', () => {
          try { socket.emit('join', session.user!.id); } catch { /* ignore */ }
        });

        socket.on('conversation_created', (payload: any) => {
          try {
            onNewConversation(payload.conversation || payload);
          } catch { /* ignore */ }
        });

        socket.on('conversation_message', (payload: any) => {
          try {
            if (!payload) return;
            const { conversationId: cid, message: m } = payload;
            if (cid && conversationId && cid === conversationId) {
              const newMsg: Message = {
                id: m.id || `${Date.now()}-${Math.random()}`,
                type: m.sender === 'user' ? 'user' : 'assistant',
                content: m.senderName ? `${m.senderName}:\n${m.message}` : m.message,
                timestamp: new Date(m.createdAt || Date.now()),
              };
              onConversationMessage(newMsg, cid);
            }
            try { onRefreshConversations(); } catch { /* ignore */ }
          } catch (e) {
            console.error('Error handling conversation_message', e);
          }
        });
      } catch {
        // ignore socket setup errors
      }
    };

    setup();

    return () => {
      try { if (socket?.disconnect) socket.disconnect(); } catch { /* ignore */ }
    };
  }, [session]);
}
