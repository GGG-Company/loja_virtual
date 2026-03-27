'use client';

import { forwardRef } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { AssistantMode } from './types';

interface ChatInputBarProps {
  value: string;
  isLoading: boolean;
  assistantMode: AssistantMode;
  onChange: (value: string) => void;
  onSend: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
}

export const ChatInputBar = forwardRef<HTMLInputElement, ChatInputBarProps>(
  ({ value, isLoading, assistantMode, onChange, onSend, onKeyPress }, ref) => {
    return (
      <div className="p-4 border-t bg-white">
        <div className="flex gap-2">
          <Input
            ref={ref}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyPress={onKeyPress}
            placeholder="Digite sua pergunta..."
            disabled={isLoading}
            className="flex-1"
            maxLength={500}
          />
          <Button
            onClick={onSend}
            disabled={!value.trim() || isLoading}
            size="icon"
            className={`${
              assistantMode === 'ai'
                ? 'bg-purple-600 hover:bg-purple-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-2 text-center">
          {assistantMode === 'ai'
            ? '🤖 Modo IA • Respostas contextuais'
            : '⚡ Modo Smart • Respostas rápidas'}
        </p>
      </div>
    );
  }
);

ChatInputBar.displayName = 'ChatInputBar';
