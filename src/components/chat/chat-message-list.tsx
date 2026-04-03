'use client';

import { forwardRef } from 'react';
import type { Message } from './types';
import { ChatMessageBubble, PendingHumanRequest } from './chat-message-bubble';
import { ChatTypingIndicator } from './chat-typing-indicator';

interface ChatMessageListProps {
  messages: Message[];
  isLoading: boolean;
  pendingHumanRequest: string | null;
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  onProductClick: (product: any) => void;
  onConfirmHumanRequest: () => void;
  onCancelHumanRequest: () => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export const ChatMessageList = forwardRef<HTMLDivElement, ChatMessageListProps>(
  (
    {
      messages,
      isLoading,
      pendingHumanRequest,
      onScroll,
      onProductClick,
      onConfirmHumanRequest,
      onCancelHumanRequest,
      messagesEndRef,
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50"
      >
        {messages.map((message) => (
          <ChatMessageBubble
            key={message.id}
            message={message}
            onProductClick={onProductClick}
          />
        ))}

        {pendingHumanRequest && (
          <PendingHumanRequest
            message={pendingHumanRequest}
            onConfirm={onConfirmHumanRequest}
            onCancel={onCancelHumanRequest}
          />
        )}

        {isLoading && <ChatTypingIndicator />}

        <div ref={messagesEndRef} />
      </div>
    );
  }
);

ChatMessageList.displayName = 'ChatMessageList';
