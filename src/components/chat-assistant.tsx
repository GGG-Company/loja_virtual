'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { MessageCircle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Card } from '@/components/ui/card';
import { useRouter } from 'next/navigation';

import type { Message, AssistantMode, AssistantResponse } from './chat/types';
import { loadChatStorage, useChatStoragePersistence } from './chat/use-chat-storage';
import { useSupportSocket } from './chat/use-support-socket';
import { useConversationSocket } from './chat/use-conversation-socket';
import { detectHumanRequest } from './chat/human-request-utils';
import { ChatHeader } from './chat/chat-header';
import { ChatSettingsPanel } from './chat/chat-settings-panel';
import { ChatApiBanner } from './chat/chat-api-banner';
import { ChatMessageList } from './chat/chat-message-list';
import { ChatInputBar } from './chat/chat-input-bar';

const WELCOME_MESSAGE: Message = {
  id: '1',
  type: 'assistant',
  content:
    'Olá! 👋 Sou seu assistente virtual. Como posso ajudá-lo hoje?\n\nPosso responder sobre:\n• Produtos e preços\n• Formas de pagamento\n• Frete e entrega\n• Trocas e devoluções\n• Acompanhamento de pedidos',
  timestamp: new Date(),
};

export function ChatAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [assistantMode, setAssistantMode] = useState<AssistantMode>('smart');
  const [showSettings, setShowSettings] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [supportChatId, setSupportChatId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Array<any>>([]);
  const [pendingHumanRequest, setPendingHumanRequest] = useState<string | null>(null);
  const [copiedProtocol, setCopiedProtocol] = useState(false);
  const [apiBanner, setApiBanner] = useState<{ type: 'info' | 'success' | 'error'; text: string } | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const { data: session } = useSession();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const supportSeenRef = useRef<Set<string>>(new Set());
  const autoCreatingRef = useRef(false);
  const router = useRouter();

  const apiEndpoint = assistantMode === 'ai' ? '/api/assistant-ai' : '/api/assistant';

  // ─── Fetch site config ────────────────────────────────────────────────────
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/site-config');
        if (res.ok) {
          const data = await res.json();
          setAssistantMode(data.assistantMode || 'smart');
        }
      } catch (e) {
        console.error('Erro ao buscar configuração:', e);
      }
    };
    fetchConfig();
  }, []);

  // ─── Restore from localStorage ───────────────────────────────────────────
  useEffect(() => {
    try {
      const saved = loadChatStorage();
      if (saved) {
        if (saved.messages.length > 0) {
          setMessages(saved.messages);
          for (const m of saved.messages) supportSeenRef.current.add(m.id);
        }
        if (saved.supportChatId) setSupportChatId(saved.supportChatId);
        if (saved.conversationId) setConversationId(saved.conversationId);
      }
    } catch (e) {
      console.error('Erro ao carregar histórico do chat:', e);
    }
  }, []);

  // ─── Persist to localStorage ─────────────────────────────────────────────
  useChatStoragePersistence(messages, supportChatId, conversationId);

  // ─── Auto-scroll to bottom ───────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ─── Load conversations for authenticated users ───────────────────────────
  const loadConversations = useCallback(async () => {
    if (!session?.user) return;
    try {
      const res = await fetch('/api/conversations');
      if (res.ok) {
        const data = await res.json();
        setConversations(data || []);
      }
    } catch (e) {
      console.error('Erro ao carregar conversas:', e);
    }
  }, [session]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // ─── Sockets ──────────────────────────────────────────────────────────────
  const handleSupportMessage = useCallback((msg: Message) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  useSupportSocket({ supportChatId, onNewMessage: handleSupportMessage });

  useConversationSocket({
    session,
    conversationId,
    onNewConversation: (convo) => setConversations((prev) => [convo, ...prev].slice(0, 3)),
    onConversationMessage: (msg) => setMessages((prev) => [...prev, msg]),
    onRefreshConversations: loadConversations,
  });

  // ─── Restore from server if localStorage is empty ────────────────────────
  useEffect(() => {
    const restore = async () => {
      if (conversationId && messages.length <= 1 && session?.user) {
        try {
          const res = await fetch(`/api/conversations/${conversationId}`);
          if (res.ok) {
            const data = await res.json();
            const restored: Message[] = data.messages.map((m: any) => ({
              id: m.id,
              type: m.sender === 'user' ? 'user' : 'assistant',
              content: m.senderName ? `${m.senderName}:\n${m.message}` : m.message,
              timestamp: new Date(m.createdAt),
            }));
            setMessages(restored);
            supportSeenRef.current.clear();
          }
        } catch (e) {
          console.error('Erro ao restaurar conversa do servidor:', e);
        }
      }

      if (supportChatId && messages.length <= 1) {
        try {
          const res = await fetch(`/api/support/chats/${supportChatId}`);
          if (res.ok) {
            const data = await res.json();
            const msgs = data.chat?.messages || [];
            const restored: Message[] = msgs.map((m: any) => ({
              id: m.id,
              type: m.sender === 'attendant' ? 'assistant' : 'user',
              content: m.senderName ? `${m.senderName}:\n${m.message}` : m.message,
              timestamp: new Date(m.createdAt),
            }));
            setMessages(restored);
            for (const m of msgs) supportSeenRef.current.add(m.id);
          }
        } catch (e) {
          console.error('Erro ao restaurar atendimento do servidor:', e);
        }
      }
    };
    restore();
  }, [conversationId, supportChatId, session]);

  // ─── Detect human-agent request in last assistant message ─────────────────
  useEffect(() => {
    if (pendingHumanRequest || supportChatId) return;
    if (!messages.length) return;
    const last = messages[messages.length - 1];
    if (!last || last.type !== 'assistant') return;
    if (detectHumanRequest(last.content)) {
      autoCreateHumanRequest(last.content);
    }
  }, [messages, pendingHumanRequest, supportChatId]);

  // ─── Fetch initial support messages when supportChatId is set ────────────
  useEffect(() => {
    if (!supportChatId) return;
    let mounted = true;

    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/support/chats/${supportChatId}`);
        if (!res.ok) return;
        const data = await res.json();
        const chat = data.chat;
        const msgs = chat?.messages || [];

        const newMsgs: Message[] = [];
        for (const m of msgs) {
          if (supportSeenRef.current.has(m.id)) continue;
          supportSeenRef.current.add(m.id);
          newMsgs.push({
            id: m.id,
            type: m.sender === 'attendant' ? 'assistant' : 'user',
            content: m.sender === 'attendant' ? `${m.senderName}:\n${m.message}` : m.message,
            timestamp: new Date(m.createdAt),
          });
        }

        if (mounted && newMsgs.length > 0) setMessages((prev) => [...prev, ...newMsgs]);

        if (chat && (chat.status === 'CLOSED' || chat.status === 'RESOLVED')) {
          const finalId = `support-final-${chat.id}`;
          if (!supportSeenRef.current.has(finalId)) {
            supportSeenRef.current.add(finalId);
            setMessages((prev) => [
              ...prev,
              {
                id: finalId,
                type: 'assistant',
                content: 'Este atendimento foi finalizado. Caso precise, abra um novo atendimento.',
                timestamp: new Date(),
              },
            ]);
          }
          setSupportChatId(null);
        }
      } catch (e) {
        console.error('Erro ao buscar mensagens do suporte:', e);
      }
    };

    fetchMessages();
    return () => { mounted = false; };
  }, [supportChatId]);

  // ─── Scroll-up to load older messages ────────────────────────────────────
  const handleScroll = async (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollTop > 50 || isLoadingMore) return;

    const first = messages[0];
    const before = first ? first.timestamp.toISOString() : new Date().toISOString();
    const source = supportChatId
      ? `/api/support/chats/${supportChatId}`
      : conversationId
      ? `/api/conversations/${conversationId}`
      : null;

    if (!source) return;
    setIsLoadingMore(true);
    try {
      const res = await fetch(`${source}?before=${encodeURIComponent(before)}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        const older: any[] = data.messages || [];
        if (older.length === 0) return;
        const prevScrollHeight = el.scrollHeight;
        const newMsgs: Message[] = older.map((m: any) => ({
          id: m.id,
          type: supportChatId
            ? m.sender === 'attendant' ? 'assistant' : 'user'
            : m.sender === 'user' ? 'user' : 'assistant',
          content: m.senderName ? `${m.senderName}:\n${m.message}` : m.message,
          timestamp: new Date(m.createdAt),
        }));
        setMessages((prev) => [...newMsgs, ...prev]);
        requestAnimationFrame(() => {
          el.scrollTop = el.scrollHeight - prevScrollHeight + el.scrollTop;
        });
      }
    } catch (e) {
      console.error('Erro ao carregar mensagens anteriores:', e);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // ─── Open support ticket ──────────────────────────────────────────────────
  const openSupportChat = async (initialMessage: string): Promise<string | null> => {
    const payload = {
      userName: session?.user?.name || 'Visitante',
      userEmail: session?.user?.email || undefined,
      subject: 'Solicitação de Atendimento',
      initialMessage,
    };
    const res = await fetch('/api/support/chats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      return data.id as string;
    }
    const err = await res.json().catch(() => ({}));
    toast.error(err?.error || 'Erro ao criar atendimento');
    return null;
  };

  const autoCreateHumanRequest = async (initialMsg: string) => {
    if (!initialMsg || supportChatId || autoCreatingRef.current) return;
    autoCreatingRef.current = true;
    setIsLoading(true);
    try {
      const id = await openSupportChat(initialMsg);
      if (id) {
        setSupportChatId(id);
        supportSeenRef.current.clear();
        setMessages((prev) => [
          ...prev,
          { id: `${Date.now() + 2}`, type: 'assistant', content: 'Te agradeço pelas informações fornecidas, agora estarei te transferindo para a nossa equipe técnica. 🔧', timestamp: new Date() },
          { id: `${Date.now() + 3}`, type: 'assistant', content: `Seu protocolo de atendimento é: ${id}\n\nEm breve um de nossos atendentes irá te responder.`, timestamp: new Date() },
        ]);
        toast.success(`Atendimento iniciado. Protocolo: ${id}`);
        setPendingHumanRequest(null);
      }
    } catch (e) {
      console.error('Erro ao auto criar atendimento:', e);
      toast.error('Erro ao criar atendimento. Tente novamente.');
    } finally {
      autoCreatingRef.current = false;
      setIsLoading(false);
    }
  };

  const confirmHumanRequest = async () => {
    if (!pendingHumanRequest) return;
    setIsLoading(true);
    try {
      const id = await openSupportChat(pendingHumanRequest);
      if (id) {
        setSupportChatId(id);
        supportSeenRef.current.clear();
        setMessages((prev) => [
          ...prev,
          { id: `${Date.now() + 2}`, type: 'assistant', content: 'Te agradeço pelas informações fornecidas, agora estarei te transferindo para a nossa equipe técnica. 🔧', timestamp: new Date() },
          { id: `${Date.now() + 3}`, type: 'assistant', content: `Seu protocolo de atendimento é: ${id}\n\nEm breve um de nossos atendentes irá te responder.`, timestamp: new Date() },
        ]);
        toast.success(`Atendimento iniciado. Protocolo: ${id}`);
        setPendingHumanRequest(null);
      } else {
        setMessages((prev) => [
          ...prev,
          { id: `${Date.now() + 5}`, type: 'assistant', content: 'Não foi possível abrir o atendimento no momento. Tente novamente mais tarde.', timestamp: new Date() },
        ]);
      }
    } catch (e) {
      console.error('Erro ao confirmar abertura de suporte:', e);
      toast.error('Erro ao criar atendimento. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Send message ─────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // User explicitly requesting human support
      if (!supportChatId && detectHumanRequest(userMessage.content)) {
        const id = await openSupportChat(userMessage.content);
        if (id) {
          setSupportChatId(id);
          supportSeenRef.current.clear();
          setMessages((prev) => [
            ...prev,
            { id: `${Date.now() + 3}`, type: 'assistant', content: `Seu protocolo de atendimento é: ${id}\n\nEm breve um de nossos atendentes irá te responder.`, timestamp: new Date() },
          ]);
          toast.success(`Atendimento iniciado. Protocolo: ${id}`);
        }
        setIsLoading(false);
        return;
      }

      // Forward to open support ticket
      if (supportChatId) {
        try {
          const res = await fetch(`/api/support/chats/${supportChatId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: input }),
          });
          if (res.ok) {
            const data = await res.json().catch(() => ({}));
            const serverId = data?.id || data?.message?.id || data?.messageId;
            if (serverId) {
              setMessages((prev) =>
                prev.map((m) => (m.id === userMessage.id ? { ...m, id: serverId } : m))
              );
              supportSeenRef.current.add(serverId);
            }
          } else {
            toast.error('Erro ao enviar mensagem ao suporte');
          }
        } catch (e) {
          console.error('Erro no envio para suporte:', e);
        }
        setIsLoading(false);
        return;
      }

      // Authenticated user — persist to conversation
      if (session?.user) {
        if (!conversationId) {
          const res = await fetch('/api/conversations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: 'Chat com Assistente', initialMessage: input, senderName: session.user.name }),
          });
          if (res.ok) {
            const convo = await res.json();
            setConversationId(convo.id);
            setConversations((prev) => [convo, ...prev].slice(0, 3));
            await fetchAndAppendAssistantReply(input, convo.id);
            setIsLoading(false);
            return;
          }
        } else {
          await fetch(`/api/conversations/${conversationId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: input, sender: 'user', senderName: session.user.name }),
          });
          await fetchAndAppendAssistantReply(input, conversationId);
          setIsLoading(false);
          return;
        }
      }

      // Anonymous / fallback
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: input }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 503 && errorData.fallback) {
          const fb = await fetch(errorData.fallback, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question: input }),
          });
          const fbData = await fb.json();
          setMessages((prev) => [
            ...prev,
            {
              id: `${Date.now() + 1}`,
              type: 'assistant',
              content: `⚠️ IA não configurada. Usando assistente padrão:\n\n${fbData.answer}`,
              timestamp: new Date(),
              data: fbData.data,
            },
          ]);
          setIsLoading(false);
          return;
        }
        throw new Error('Erro na resposta');
      }

      const data: AssistantResponse = await response.json();

      if (data.type === 'request_human' && data.data?.requestSupport) {
        setMessages((prev) => [
          ...prev,
          { id: `${Date.now() + 1}`, type: 'assistant', content: data.answer, timestamp: new Date(), data: data.data },
        ]);
        setPendingHumanRequest(userMessage.content || 'Solicitação de atendimento humano');
        setIsLoading(false);
        return;
      }

      setMessages((prev) => [
        ...prev,
        { id: `${Date.now() + 1}`, type: 'assistant', content: data.answer, timestamp: new Date(), data: data.data, aiPowered: data.aiPowered },
      ]);

      if (detectHumanRequest(data.answer) || detectHumanRequest(String(data?.data))) {
        setPendingHumanRequest(userMessage.content || 'Solicitação de atendimento humano');
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `${Date.now() + 1}`, type: 'assistant', content: 'Desculpe, ocorreu um erro. Por favor, tente novamente.', timestamp: new Date() },
      ]);
    } finally {
      setIsLoading(false);
      try { inputRef.current?.focus(); } catch { /* ignore */ }
    }
  };

  const fetchAndAppendAssistantReply = async (question: string, cid: string) => {
    try {
      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, conversationId: cid }),
      });
      if (res.ok) {
        const data: AssistantResponse = await res.json();
        setMessages((prev) => [
          ...prev,
          { id: `${Date.now() + 1}`, type: 'assistant', content: data.answer, timestamp: new Date(), data: data.data, aiPowered: data.aiPowered },
        ]);
        try {
          await fetch(`/api/conversations/${cid}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: data.answer, sender: 'assistant', senderName: 'Assistente' }),
          });
        } catch { /* ignore */ }
      }
    } catch (e) {
      console.error('Erro ao obter resposta do assistente:', e);
    }
  };

  // ─── Other helpers ────────────────────────────────────────────────────────
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleProductClick = (product: any) => {
    router.push(`/produtos/${product.slug}`);
    setIsOpen(false);
  };

  const toggleAssistantMode = () => {
    const newMode: AssistantMode = assistantMode === 'smart' ? 'ai' : 'smart';
    setAssistantMode(newMode);
    setShowSettings(false);
    setMessages((prev) => [
      ...prev,
      {
        id: `${Date.now() + 2}`,
        type: 'assistant',
        content:
          newMode === 'ai'
            ? '🤖 Modo IA ativado! Agora estou usando inteligência artificial para respostas mais naturais e contextuais.'
            : '⚡ Modo Smart ativado! Usando sistema de busca rápida e respostas estruturadas.',
        timestamp: new Date(),
      },
    ]);
  };

  const copyProtocol = async () => {
    if (!supportChatId) return;
    try {
      await navigator.clipboard.writeText(supportChatId);
      setCopiedProtocol(true);
      setTimeout(() => setCopiedProtocol(false), 2000);
    } catch { /* ignore */ }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className={`fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg transition-all ${
            assistantMode === 'ai'
              ? 'bg-purple-600 hover:bg-purple-700'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
          style={{ zIndex: 2147483647 }}
          size="icon"
        >
          {assistantMode === 'ai' ? (
            <Sparkles className="h-6 w-6" />
          ) : (
            <MessageCircle className="h-6 w-6" />
          )}
        </Button>
      )}

      {/* Chat window */}
      {isOpen && (
        <Card
          className={`fixed bottom-6 right-6 w-[320px] sm:w-[360px] md:w-[400px] max-h-[calc(100vh-48px)] flex flex-col shadow-2xl border-2 ${
            assistantMode === 'smart' ? 'h-[420px] md:h-[520px]' : 'h-[500px] md:h-[600px]'
          }`}
          style={{ zIndex: 2147483647 }}
        >
          <ChatHeader
            assistantMode={assistantMode}
            supportChatId={supportChatId}
            copiedProtocol={copiedProtocol}
            onClose={() => setIsOpen(false)}
            onCopyProtocol={copyProtocol}
          />

          <ChatApiBanner banner={apiBanner} />

          {showSettings && (
            <ChatSettingsPanel
              assistantMode={assistantMode}
              onToggleMode={toggleAssistantMode}
            />
          )}

          <ChatMessageList
            ref={messagesContainerRef}
            messages={messages}
            isLoading={isLoading}
            pendingHumanRequest={pendingHumanRequest}
            onScroll={handleScroll}
            onProductClick={handleProductClick}
            onConfirmHumanRequest={confirmHumanRequest}
            onCancelHumanRequest={() => setPendingHumanRequest(null)}
            messagesEndRef={messagesEndRef}
          />

          <ChatInputBar
            ref={inputRef}
            value={input}
            isLoading={isLoading}
            assistantMode={assistantMode}
            onChange={setInput}
            onSend={handleSend}
            onKeyPress={handleKeyPress}
          />
        </Card>
      )}
    </>
  );
}
