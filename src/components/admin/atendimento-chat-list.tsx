'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { ReactNode } from 'react';

export interface SupportChatSummary {
  id: string;
  userName: string;
  userEmail?: string;
  subject: string;
  status: string;
  createdAt: string;
  _count: { messages: number };
  user?: { name?: string; email?: string };
  attendant?: { name?: string };
}

interface AtendimentoChatListProps {
  chats: SupportChatSummary[];
  selectedChatId: string | null;
  filterStatus: string;
  onFilterChange: (status: string) => void;
  onSelectChat: (id: string) => void;
  getStatusBadge: (chat: SupportChatSummary) => ReactNode;
}

const FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Ativos' },
  { value: 'bot', label: 'Bot' },
  { value: 'IN_PROGRESS', label: 'Em Progresso' },
  { value: 'closed', label: 'Fechados' },
];

export function AtendimentoChatList({
  chats,
  selectedChatId,
  filterStatus,
  onFilterChange,
  onSelectChat,
  getStatusBadge,
}: AtendimentoChatListProps) {
  return (
    <Card className="lg:col-span-1">
      <CardHeader>
        <CardTitle>Tickets de Suporte</CardTitle>
        <CardDescription>
          {chats.length} ticket{chats.length !== 1 ? 's' : ''}
        </CardDescription>
        <div className="flex gap-2 flex-wrap mt-4">
          {FILTERS.map((f) => (
            <Button
              key={f.value}
              size="sm"
              variant={filterStatus === f.value ? 'default' : 'outline'}
              onClick={() => onFilterChange(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
        {chats.map((chat) => (
          <div
            key={chat.id}
            onClick={() => onSelectChat(chat.id)}
            className={`p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition ${
              selectedChatId === chat.id ? 'bg-blue-50 border-blue-500' : ''
            }`}
          >
            <div className="flex justify-between items-start mb-1">
              <span className="font-semibold text-sm">{chat.user?.name || chat.userName}</span>
              {getStatusBadge(chat)}
            </div>
            <p className="text-xs text-gray-600 mb-1">{chat.subject}</p>
            <div className="flex justify-between items-center text-xs text-gray-500">
              <span>{chat._count.messages} mensagens</span>
              <span>{new Date(chat.createdAt).toLocaleDateString('pt-BR')}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
