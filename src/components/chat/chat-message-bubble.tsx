'use client';

import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Message } from './types';

interface ChatMessageBubbleProps {
  message: Message;
  onProductClick: (product: any) => void;
}

export function ChatMessageBubble({ message, onProductClick }: ChatMessageBubbleProps) {
  return (
    <div className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-lg p-3 ${
          message.type === 'user'
            ? 'bg-blue-600 text-white'
            : 'bg-white border shadow-sm'
        }`}
      >
        <div className="text-sm whitespace-pre-wrap">{message.content}</div>

        {/* AI powered badge */}
        {message.type === 'assistant' && message.aiPowered && (
          <div className="mt-2 flex items-center gap-1 text-xs text-purple-600">
            <Sparkles className="h-3 w-3" />
            <span>Powered by AI</span>
          </div>
        )}

        {/* Product list */}
        {message.data && Array.isArray(message.data) && message.data.length > 0 && (
          <div className="mt-3 space-y-2">
            {message.data.map((product: any) => (
              <button
                key={product.id}
                onClick={() => onProductClick(product)}
                className="w-full text-left p-2 bg-gray-50 hover:bg-gray-100 rounded border text-sm transition-colors"
              >
                <div className="font-medium text-gray-900">{product.name}</div>
                <div className="text-xs text-gray-600 mt-1">
                  {product.category?.name} • R${' '}
                  {(product.promotionalPrice ?? product.price).toFixed(2)}
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="text-xs opacity-70 mt-1">
          {message.timestamp.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </div>
  );
}

interface PendingHumanRequestProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function PendingHumanRequest({ message, onConfirm, onCancel }: PendingHumanRequestProps) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] rounded-lg p-3 bg-white border shadow-sm">
        <div className="text-sm whitespace-pre-wrap">
          Deseja abrir um atendimento humano com a mensagem abaixo?
        </div>
        <div className="mt-2 p-2 bg-gray-100 rounded text-sm whitespace-pre-wrap">{message}</div>
        <div className="mt-3 flex gap-2">
          <Button onClick={onConfirm} size="sm">
            Confirmar atendimento humano
          </Button>
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}
