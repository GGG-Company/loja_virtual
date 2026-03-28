'use client';

import { useEffect, useRef } from 'react';
import type { Message } from './types';

interface UseSupportSocketOptions {
  supportChatId: string | null;
  onNewMessage: (msg: Message) => void;
}

/** Connects to Socket.IO for real-time support chat messages. */
export function useSupportSocket({ supportChatId, onNewMessage }: UseSupportSocketOptions) {
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!supportChatId) return;
    let socket: any = null;
    let mounted = true;

    const connect = async () => {
      try {
        const { io } = await import('socket.io-client');
        const url = process.env.NEXT_PUBLIC_SOCKET_URL;
        if (!url) return;
        socket = io(url, { transports: ['websocket'], reconnectionAttempts: 3 });

        socket.on('connect', () => {
          try { socket.emit('join', supportChatId); } catch { /* ignore */ }
        });

        socket.on('new_message', (payload: any) => {
          try {
            const m = payload?.message;
            if (!m) return;
            if (m.id && seenRef.current.has(m.id)) return;
            if (m.id) seenRef.current.add(m.id);

            const newMsg: Message =
              m.sender === 'attendant'
                ? {
                    id: m.id || `assist-${Date.now()}`,
                    type: 'assistant',
                    content: `${m.senderName || 'Assistente'}:\n${m.message}`,
                    timestamp: new Date(m.createdAt || Date.now()),
                  }
                : {
                    id: m.id || `user-${Date.now()}`,
                    type: 'user',
                    content: m.message,
                    timestamp: new Date(m.createdAt || Date.now()),
                  };

            if (mounted) onNewMessage(newMsg);
          } catch (e) {
            console.error('Error handling new_message', e);
          }
        });

        socket.on('connect_error', (err: any) => {
          console.warn('chat-assistant socket connect_error', err);
        });
      } catch {
        // dynamic import or connection failed
      }
    };

    connect();

    return () => {
      mounted = false;
      try { if (socket?.disconnect) socket.disconnect(); } catch { /* ignore */ }
    };
  }, [supportChatId, onNewMessage]);

  return seenRef;
}
