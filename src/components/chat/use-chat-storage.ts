'use client';

import { useEffect } from 'react';
import type { Message } from './types';

const STORAGE_KEY = 'support_chat_state_v1';

interface StorageState {
  messages: Message[];
  supportChatId: string | null;
  conversationId: string | null;
}

export function loadChatStorage(): StorageState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.messages || !Array.isArray(parsed.messages)) return null;
    const messages: Message[] = parsed.messages.map((m: any) => ({
      ...m,
      timestamp: new Date(m.timestamp),
    }));
    return {
      messages,
      supportChatId: parsed.supportChatId ?? null,
      conversationId: parsed.conversationId ?? null,
    };
  } catch {
    return null;
  }
}

export function saveChatStorage(
  messages: Message[],
  supportChatId: string | null,
  conversationId: string | null
) {
  try {
    const toSave = {
      supportChatId,
      conversationId,
      messages: messages.map((m) => ({ ...m, timestamp: m.timestamp.toISOString() })),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {
    // swallow
  }
}

/** Hook that persists chat state on every relevant change and on page unload. */
export function useChatStoragePersistence(
  messages: Message[],
  supportChatId: string | null,
  conversationId: string | null
) {
  useEffect(() => {
    saveChatStorage(messages, supportChatId, conversationId);
  }, [messages, supportChatId, conversationId]);

  useEffect(() => {
    const handler = () => saveChatStorage(messages, supportChatId, conversationId);
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [messages, supportChatId, conversationId]);
}
