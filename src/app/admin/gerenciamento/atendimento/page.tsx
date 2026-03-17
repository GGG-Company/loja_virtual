"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface SupportMessage {
  id: string;
  sender: string;
  senderName: string;
  message: string;
  createdAt: string;
}

interface SupportChat {
  id: string;
  userName: string;
  userEmail?: string;
  subject: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED" | "BOT";
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
  messages: SupportMessage[];
  user?: {
    name?: string;
    email?: string;
  };
  attendant?: {
    name?: string;
  };
  _count: {
    messages: number;
  };
}

export default function AtendimentoPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [chats, setChats] = useState<SupportChat[]>([]);
  const [selectedChat, setSelectedChat] = useState<SupportChat | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [copiedProtocol, setCopiedProtocol] = useState(false);
  const [protocolQuery, setProtocolQuery] = useState<string>('');

  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }

    if (session?.user?.role !== "ADMIN" && session?.user?.role !== "OWNER") {
      router.push("/");
      return;
    }

    // Carrega uma vez; atualizações em tempo real chegam via socket
    // Always load full list once; client will apply filters to avoid relying on server-side 'bot' filter
    loadChats();
    return;
  }, [session, status, router, filterStatus]);

  // Polling de mensagens para o chat selecionado — atualiza a conversa a cada 3s
  useEffect(() => {
    if (!selectedChat?.id) return;
    let mounted = true;

    // Conecta via Socket.IO para atualizações em tempo real
      let socket: any = null;
      const connectSocket = async () => {
        try {
          // Always request full list from server; client will apply filtering
          const response = await fetch('/api/support/chats');
              if (response.ok) {
            const data = await response.json();
            const all = (Array.isArray(data) ? data : data.chats || []) as SupportChat[];
            setChats(all);
          }

          // Optional: connect to remote socket server for realtime updates
          if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_SOCKET_URL) {
            try {
              const io = (await import('socket.io-client')).default;
              socket = io(process.env.NEXT_PUBLIC_SOCKET_URL as string);
              if (selectedChat?.id) {
                socket.emit('join', `support:chat:${selectedChat.id}`);
              }
              socket.on('support:message', (msg: any) => {
                if (msg?.chatId === selectedChat?.id) {
                  loadChatMessages(selectedChat.id);
                  loadChats();
                } else {
                  loadChats();
                }
              });
            } catch (e) {
              // ignore socket errors
              console.warn('Socket connect failed', e);
            }
          }
        } catch (e) {
          console.error('Erro no connectSocket', e);
        }
      };

      connectSocket();

      return () => {
        mounted = false;
        try { socket && socket.disconnect && socket.disconnect(); } catch (e) {}
      };
    }, [selectedChat?.id]);

  // Auto-scroll quando mensagens do chat selecionado mudam
  useEffect(() => {
    try {
      const el = messagesContainerRef.current;
      if (!el) return;
      // small delay to ensure DOM updated
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
    } catch (e) {
      // swallow
    }
  }, [selectedChat?.messages?.length, selectedChat?.id]);

  const loadChats = async () => {
    try {
      // Always request full list from server; client will apply filtering
      const response = await fetch('/api/support/chats');
      if (response.ok) {
        const data = await response.json();
        const all = (Array.isArray(data) ? data : data.chats || []) as SupportChat[];
        // debug log: show fetched chats for troubleshooting
        try { console.debug('[admin] loadChats fetched', all.length, all.map(c => ({ id: c.id, status: c.status, attendant: c.attendant?.name || null }))); } catch (e) {}
        // NOTE: treat "all" as open + in-progress only (exclude closed/resolved)
        if (filterStatus === "all") {
          const filtered = all.filter(c => c.status === 'OPEN' || c.status === 'IN_PROGRESS');
          setChats(filtered);
        } else if (filterStatus === "OPEN") {
          // Ativos: chats that are OPEN
          const open = all.filter(c => c.status === 'OPEN');
          setChats(open);
        } else if (filterStatus === "bot") {
          // Server already returns BOT chats when requested with ?status=bot
          setChats(all);
        } else if (filterStatus === "IN_PROGRESS") {
          const inprog = all.filter(c => c.status === 'IN_PROGRESS');
          setChats(inprog);
        } else if (filterStatus === "closed") {
          const closed = all.filter(c => c.status === 'CLOSED' || c.status === 'RESOLVED');
          setChats(closed);
        } else {
          setChats(all);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar chats:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadChatMessages = async (chatId: string) => {
    try {
      const response = await fetch(`/api/support/chats/${chatId}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedChat(data?.chat || data);
      }
    } catch (error) {
      console.error("Erro ao carregar mensagens:", error);
    }
  };

  const copyProtocol = async (protocol?: string) => {
    if (!protocol) return;
    try {
      await navigator.clipboard.writeText(protocol);
      setCopiedProtocol(true);
      setTimeout(() => setCopiedProtocol(false), 2000);
    } catch (e) {
      console.error('Erro ao copiar protocolo:', e);
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || !selectedChat) return;

    setSendingMessage(true);
    try {
      const response = await fetch(`/api/support/chats/${selectedChat.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message.trim(),
          asAttendant: true,
        }),
      });

      if (response.ok) {
        setMessage("");
        await loadChatMessages(selectedChat.id);
        await loadChats();
      }
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
    } finally {
      setSendingMessage(false);
      try {
        if (inputRef && inputRef.current) inputRef.current.focus();
      } catch (e) {}
    }
  };

  const updateChatStatus = async (chatId: string, status: string) => {
    try {
      const response = await fetch(`/api/support/chats/${chatId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        await loadChats();
        if (selectedChat?.id === chatId) {
          await loadChatMessages(chatId);
        }
      }
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
    }
  };

  const assumeChat = async (chatId: string) => {
    try {
      // Envia mensagem automática ao assumir o atendimento
      const messageResponse = await fetch(`/api/support/chats/${chatId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Antes de iniciar gostaria de informar que o número do protocolo de atendimento é ${chatId}.`,
          asAttendant: true,
        }),
      });

      if (messageResponse.ok) {
        await loadChats();
        await loadChatMessages(chatId);
      }
    } catch (error) {
      console.error("Erro ao assumir chat:", error);
    }
  };

  const detectHumanRequestInMessages = (msgs: SupportMessage[] = []) => {
    const customers = msgs.filter(m => m.sender === 'customer' || m.sender === 'user');
    for (const m of customers) {
      const t = String(m.message || '').toLowerCase();
      const patterns = [
        'atendente',
        'atendimento humano',
        'falar com atendente',
        'fale com um atendente',
        'quero falar com',
        'preciso falar com',
      ];
      if (patterns.some(p => t.includes(p))) return true;
    }
    return false;
  };

  const getStatusBadge = (chatOrStatus: any) => {
    const isString = typeof chatOrStatus === 'string';
    let status = isString ? chatOrStatus : chatOrStatus?.status;
    const msgs: SupportMessage[] = isString ? [] : chatOrStatus?.messages || [];

    // Determine if this chat should be considered a bot-handled chat
    const chatObj = isString ? null : chatOrStatus;
    const botDetected = chatObj ? isBotChat(chatObj) : false;

    // If detected as bot-handled, display as Bot (distinct color)
    if (botDetected) {
      return <Badge className={'bg-indigo-600 text-white'}>Bot</Badge>;
    }

    const statusConfig = {
      BOT: { label: 'Bot', color: 'bg-indigo-600' },
      OPEN: { label: 'Aberto', color: 'bg-red-500' },
      IN_PROGRESS: { label: 'Em Progresso', color: 'bg-yellow-500' },
      RESOLVED: { label: 'Resolvido', color: 'bg-green-500' },
      CLOSED: { label: 'Fechado', color: 'bg-gray-500' },
    } as const;

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.OPEN;
    return <Badge className={config.color + ' text-white'}>{config.label}</Badge>;
  };

  const isBotChat = (chat: SupportChat) => {
    if (!chat) return false;
    if (chat.status !== 'OPEN') return false;
    const hasAttendant = Boolean(chat?.attendant) || (chat.messages || []).some(m => m.sender === 'attendant');
    const customerRequestedHuman = detectHumanRequestInMessages(chat.messages || []);
    return !hasAttendant && !customerRequestedHuman;
  };

  const displayedChats = useMemo(() => {
    const q = protocolQuery.trim().toLowerCase();
    let filtered = q
      ? chats.filter(c => (
          (c.id || '').toLowerCase().includes(q) ||
          ((c.user?.email || c.userEmail || '') as string).toLowerCase().includes(q) ||
          ((c.user?.name || c.userName || '') as string).toLowerCase().includes(q)
        ))
      : [...chats];

    if (filterStatus === 'bot') {
      // show only chats considered bot-handled or explicitly marked as BOT
      filtered = filtered.filter(c => isBotChat(c) || c.status === 'BOT');
    } else if (filterStatus === 'active') {
      // active = only OPEN (exclude bot-handled)
      filtered = filtered.filter(c => c.status === 'OPEN' && !isBotChat(c));
    } else if (filterStatus === 'all') {
      // all = OPEN + IN_PROGRESS (exclude bot-handled)
      filtered = filtered.filter(c => (c.status === 'OPEN' || c.status === 'IN_PROGRESS') && !isBotChat(c));
    } else if (filterStatus === 'IN_PROGRESS') {
      filtered = filtered.filter(c => c.status === 'IN_PROGRESS' && !isBotChat(c));
    } else if (filterStatus === 'closed') {
      filtered = filtered.filter(c => c.status === 'CLOSED' || c.status === 'RESOLVED');
    }
    return filtered;
  }, [chats, protocolQuery, filterStatus]);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Atendimento ao Cliente</h1>
          <p className="text-gray-600">Gerencie as solicitações de suporte dos clientes</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Input
            placeholder="Buscar protocolo, nome ou email"
            value={protocolQuery}
            onChange={(e) => setProtocolQuery(e.target.value)}
            className="w-full sm:w-64"
          />
          {protocolQuery && (
            <Button size="sm" variant="outline" onClick={() => setProtocolQuery('')}>
              Limpar
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de Chats */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Tickets de Suporte</CardTitle>
            <CardDescription>
                {/** show count for currently visible (filtered) chats */}
                {displayedChats.length} ticket{displayedChats.length !== 1 ? "s" : ""}
              </CardDescription>
            <div className="flex gap-2 flex-wrap mt-4">
              <Button
                size="sm"
                variant={filterStatus === "all" ? "default" : "outline"}
                onClick={() => setFilterStatus("all")}
              >
                Todos
              </Button>
              <Button
                size="sm"
                variant={filterStatus === "active" ? "default" : "outline"}
                onClick={() => setFilterStatus("active")}
              >
                Ativos
              </Button>
              <Button
                size="sm"
                variant={filterStatus === "bot" ? "default" : "outline"}
                onClick={() => setFilterStatus("bot")}
              >
                Bot
              </Button>
              <Button
                size="sm"
                variant={
                  filterStatus === "IN_PROGRESS" ? "default" : "outline"
                }
                onClick={() => setFilterStatus("IN_PROGRESS")}
              >
                Em Progresso
              </Button>
              <Button
                size="sm"
                variant={filterStatus === "closed" ? "default" : "outline"}
                onClick={() => setFilterStatus("closed")}
              >
                Fechados
              </Button>
            </div>
          </CardHeader>
            <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
            {(() => {
              return displayedChats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => loadChatMessages(chat.id)}
                className={`p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition ${
                  selectedChat?.id === chat.id ? "bg-blue-50 border-blue-500" : ""
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-semibold text-sm">
                    {chat.user?.name || chat.userName}
                  </span>
                  {getStatusBadge(chat)}
                </div>
                <p className="text-xs text-gray-600 mb-1">{chat.subject}</p>
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span>{chat._count.messages} mensagens</span>
                  <span>
                    {new Date(chat.createdAt).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              </div>
              ));
            })()}
          </CardContent>
        </Card>

        {/* Chat Selecionado */}
        <Card className="lg:col-span-2">
          {selectedChat ? (
            <>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>
                      {selectedChat.user?.name || selectedChat.userName}
                    </CardTitle>
                    <CardDescription>
                      {selectedChat.user?.email || selectedChat.userEmail} •{" "}
                      {selectedChat.subject}
                    </CardDescription>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-sm font-medium">Protocolo:</span>
                      <span className="text-sm bg-gray-100 px-2 py-1 rounded">
                        {selectedChat.id}
                      </span>
                      <button
                        className="text-sm text-blue-600 underline"
                        onClick={() => copyProtocol(selectedChat.id)}
                      >
                        {copiedProtocol ? 'Copiado!' : 'Copiar'}
                      </button>
                    </div>
                  </div>
                  {getStatusBadge(selectedChat)}
                </div>
                <div className="flex gap-2 mt-4">
                  {selectedChat.status === "OPEN" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => assumeChat(selectedChat.id)}
                      >
                        Assumir Atendimento
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          updateChatStatus(selectedChat.id, "CLOSED")
                        }
                      >
                        Fechar sem Atender
                      </Button>
                    </>
                  )}
                  {selectedChat.status === "IN_PROGRESS" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          updateChatStatus(selectedChat.id, "RESOLVED")
                        }
                      >
                        Marcar como Resolvido
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() =>
                          updateChatStatus(selectedChat.id, "CLOSED")
                        }
                      >
                        Fechar Atendimento
                      </Button>
                    </>
                  )}
                  {selectedChat.status === "RESOLVED" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        updateChatStatus(selectedChat.id, "CLOSED")
                      }
                    >
                      Fechar Ticket
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {/* Mensagens */}
                <div ref={messagesContainerRef} className="flex flex-col space-y-4 mb-4 max-h-[400px] overflow-y-auto border rounded-lg p-4 bg-gray-50">
                  {selectedChat.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`p-3 rounded-lg max-w-[80%] ${
                        (msg.sender === "customer" || msg.sender === "user")
                          ? "self-start bg-white border border-gray-200 text-gray-800"
                          : "self-end bg-blue-600 text-white border border-blue-700"
                      }`}
                    >
                      <div className={`font-semibold text-sm mb-1 ${(msg.sender === 'customer' || msg.sender === 'user') ? '' : 'text-right'}`}>
                        {msg.senderName}:
                      </div>
                      <div className="text-sm whitespace-pre-wrap">
                        {msg.message}
                      </div>
                      <div className={`text-xs mt-2 ${(msg.sender === 'customer' || msg.sender === 'user') ? 'text-gray-500' : 'text-white/80 text-right'}`}>
                        {new Date(msg.createdAt).toLocaleString("pt-BR")}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Input de Resposta */}
                {selectedChat.status !== "CLOSED" && (
                  <div className="flex gap-2">
                    <Input
                      ref={inputRef}
                      placeholder="Digite sua resposta..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      disabled={sendingMessage}
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={!message.trim() || sendingMessage}
                    >
                      {sendingMessage ? "Enviando..." : "Enviar"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </>
          ) : (
            <CardContent className="flex items-center justify-center h-full">
              <p className="text-gray-500">
                Selecione um ticket para visualizar
              </p>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
