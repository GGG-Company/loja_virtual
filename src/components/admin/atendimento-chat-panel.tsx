'use client';

import { forwardRef, type ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface SupportMessage {
  id: string;
  sender: string;
  senderName: string;
  message: string;
  createdAt: string;
}

export interface SelectedSupportChat {
  id: string;
  userName: string;
  userEmail?: string;
  subject: string;
  status: string;
  messages: SupportMessage[];
  user?: { name?: string; email?: string };
}

interface AtendimentoChatPanelProps {
  chat: SelectedSupportChat | null;
  message: string;
  isSending: boolean;
  copiedProtocol: boolean;
  messagesContainerRef: React.RefObject<HTMLDivElement | null>;
  inputRef: React.RefObject<HTMLInputElement | null>;
  getStatusBadge: (chat: SelectedSupportChat) => ReactNode;
  onMessageChange: (value: string) => void;
  onSend: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  onAssumeChat: (id: string) => void;
  onUpdateStatus: (id: string, status: string) => void;
  onCopyProtocol: (id?: string) => void;
}

export function AtendimentoChatPanel({
  chat,
  message,
  isSending,
  copiedProtocol,
  messagesContainerRef,
  inputRef,
  getStatusBadge,
  onMessageChange,
  onSend,
  onKeyPress,
  onAssumeChat,
  onUpdateStatus,
  onCopyProtocol,
}: AtendimentoChatPanelProps) {
  if (!chat) {
    return (
      <Card className="lg:col-span-2">
        <CardContent className="flex items-center justify-center h-full">
          <p className="text-gray-500">Selecione um ticket para visualizar</p>
        </CardContent>
      </Card>
    );
  }

  const isCustomer = (sender: string) => sender === 'customer' || sender === 'user';

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{chat.user?.name || chat.userName}</CardTitle>
            <CardDescription>
              {chat.user?.email || chat.userEmail} • {chat.subject}
            </CardDescription>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-sm font-medium">Protocolo:</span>
              <span className="text-sm bg-gray-100 px-2 py-1 rounded font-mono">{`ATD-${chat.id.slice(-8).toUpperCase()}`}</span>
              <button className="text-sm text-blue-600 underline" onClick={() => onCopyProtocol(`ATD-${chat.id.slice(-8).toUpperCase()}`)}>
                {copiedProtocol ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
          </div>
          {getStatusBadge(chat)}
        </div>

        <div className="flex gap-2 mt-4">
          {chat.status === 'OPEN' && (
            <>
              <Button size="sm" onClick={() => onAssumeChat(chat.id)}>
                Assumir Atendimento
              </Button>
              <Button size="sm" variant="outline" onClick={() => onUpdateStatus(chat.id, 'CLOSED')}>
                Fechar sem Atender
              </Button>
            </>
          )}
          {chat.status === 'IN_PROGRESS' && (
            <>
              <Button size="sm" variant="outline" onClick={() => onUpdateStatus(chat.id, 'RESOLVED')}>
                Marcar como Resolvido
              </Button>
              <Button size="sm" variant="destructive" onClick={() => onUpdateStatus(chat.id, 'CLOSED')}>
                Fechar Atendimento
              </Button>
            </>
          )}
          {chat.status === 'RESOLVED' && (
            <Button size="sm" variant="outline" onClick={() => onUpdateStatus(chat.id, 'CLOSED')}>
              Fechar Ticket
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* Messages */}
        <div
          ref={messagesContainerRef}
          className="flex flex-col space-y-4 mb-4 max-h-[400px] overflow-y-auto border rounded-lg p-4 bg-gray-50"
        >
          {chat.messages.map((msg) => (
            <div
              key={msg.id}
              className={`p-3 rounded-lg max-w-[80%] ${
                isCustomer(msg.sender)
                  ? 'self-start bg-white border border-gray-200 text-gray-800'
                  : 'self-end bg-blue-600 text-white border border-blue-700'
              }`}
            >
              <div
                className={`font-semibold text-sm mb-1 ${
                  isCustomer(msg.sender) ? '' : 'text-right'
                }`}
              >
                {msg.senderName}:
              </div>
              <div className="text-sm whitespace-pre-wrap">{msg.message}</div>
              <div
                className={`text-xs mt-2 ${
                  isCustomer(msg.sender) ? 'text-gray-500' : 'text-white/80 text-right'
                }`}
              >
                {new Date(msg.createdAt).toLocaleString('pt-BR')}
              </div>
            </div>
          ))}
        </div>

        {/* Reply input */}
        {chat.status !== 'CLOSED' && (
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              placeholder="Digite sua resposta..."
              value={message}
              onChange={(e) => onMessageChange(e.target.value)}
              onKeyPress={onKeyPress}
              disabled={isSending}
            />
            <Button onClick={onSend} disabled={!message.trim() || isSending}>
              {isSending ? 'Enviando...' : 'Enviar'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
