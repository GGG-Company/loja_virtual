'use client';

import { Bot, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AssistantMode } from './types';

interface ChatHeaderProps {
  assistantMode: AssistantMode;
  supportChatId: string | null;
  copiedProtocol: boolean;
  onClose: () => void;
  onCopyProtocol: () => void;
}

export function ChatHeader({
  assistantMode,
  supportChatId,
  copiedProtocol,
  onClose,
  onCopyProtocol,
}: ChatHeaderProps) {
  return (
    <div
      className={`flex items-center justify-between p-4 border-b text-white rounded-t-lg ${
        assistantMode === 'ai' ? 'bg-purple-600' : 'bg-blue-600'
      }`}
    >
      <div className="flex items-center gap-2">
        {assistantMode === 'ai' ? (
          <Sparkles className="h-5 w-5" />
        ) : (
          <Bot className="h-5 w-5" />
        )}
        <div>
          <h3 className="font-semibold">
            Assistente {assistantMode === 'ai' ? 'IA' : 'Smart'}
          </h3>
          <p className="text-xs opacity-90">
            {assistantMode === 'ai' ? 'Powered by OpenAI' : 'Respostas rápidas'}
          </p>
          {supportChatId && (
            <div className="mt-1 flex items-center gap-2">
              <span className="text-xs bg-white/10 px-2 py-1 rounded text-white">
                Protocolo: {supportChatId}
              </span>
              <button
                onClick={onCopyProtocol}
                className="text-xs underline text-white/90"
                aria-label="Copiar protocolo"
              >
                {copiedProtocol ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className={`text-white h-8 w-8 ${
            assistantMode === 'ai' ? 'hover:bg-purple-700' : 'hover:bg-blue-700'
          }`}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
