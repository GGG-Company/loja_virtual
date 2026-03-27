'use client';

import dynamic from 'next/dynamic';

const ChatAssistant = dynamic(
  () => import('@/components/chat-assistant').then(m => ({ default: m.ChatAssistant })),
  { ssr: false }
);

export function ChatAssistantLoader() {
  return <ChatAssistant />;
}
