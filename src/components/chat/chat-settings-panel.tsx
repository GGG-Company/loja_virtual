'use client';

import { Bot, Sparkles } from 'lucide-react';
import type { AssistantMode } from './types';

interface ChatSettingsPanelProps {
  assistantMode: AssistantMode;
  onToggleMode: () => void;
}

export function ChatSettingsPanel({ assistantMode, onToggleMode }: ChatSettingsPanelProps) {
  return (
    <div className="p-4 border-b bg-gray-50">
      <p className="text-sm font-medium mb-2">Modo do Assistente:</p>
      <div className="space-y-2">
        <button
          onClick={() => assistantMode !== 'smart' && onToggleMode()}
          className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
            assistantMode === 'smart'
              ? 'border-blue-600 bg-blue-50'
              : 'border-gray-200 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-blue-600" />
            <div>
              <p className="font-medium text-sm">Smart (Padrão)</p>
              <p className="text-xs text-gray-600">Respostas rápidas e estruturadas</p>
            </div>
          </div>
        </button>
        <button
          onClick={() => assistantMode !== 'ai' && onToggleMode()}
          className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
            assistantMode === 'ai'
              ? 'border-purple-600 bg-purple-50'
              : 'border-gray-200 hover:border-purple-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-600" />
            <div>
              <p className="font-medium text-sm">IA (OpenAI)</p>
              <p className="text-xs text-gray-600">Respostas naturais e contextuais</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
