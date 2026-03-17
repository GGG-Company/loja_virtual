'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Send, X, MessageCircle, Loader2, Bot, Sparkles, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from '@/components/ui/card';
import { useRouter } from 'next/navigation';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  data?: any;
  aiPowered?: boolean;
}

interface AssistantResponse {
  answer: string;
  type: string;
  data: any;
  secure?: boolean;
  context?: string;
  timestamp?: string;
  aiPowered?: boolean;
  model?: string;
}

type AssistantMode = 'smart' | 'ai';

export function ChatAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [assistantMode, setAssistantMode] = useState<AssistantMode>('smart');
  const [showSettings, setShowSettings] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: 'Olá! 👋 Sou seu assistente virtual. Como posso ajudá-lo hoje?\n\nPosso responder sobre:\n• Produtos e preços\n• Formas de pagamento\n• Frete e entrega\n• Trocas e devoluções\n• Acompanhamento de pedidos',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [supportChatId, setSupportChatId] = useState<string | null>(null);
  const supportSeenRef = useRef<Set<string>>(new Set());
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Array<any>>([]);
  const [pendingHumanRequest, setPendingHumanRequest] = useState<string | null>(null);
  const autoCreatingRef = useRef(false);
  const [participants, setParticipants] = useState<string[]>([]);
  const { data: session } = useSession();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();
  
  const apiEndpoint = assistantMode === 'ai' ? '/api/assistant-ai' : '/api/assistant';

  // Busca configuração do assistente ao carregar
  useEffect(() => {
    // mounted
    // debug badge removed in production
    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/site-config');
        if (res.ok) {
          const data = await res.json();
          setAssistantMode(data.assistantMode || 'smart');
        }
      } catch (error) {
        console.error('Erro ao buscar configuração:', error);
      }
    };
    fetchConfig();
  }, []);

  // Persistência simples do histórico no localStorage
  const STORAGE_KEY = 'support_chat_state_v1';

  // Carrega estado salvo (mensagens + supportChatId)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.messages && Array.isArray(parsed.messages) && parsed.messages.length > 0) {
          const restored: Message[] = parsed.messages.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          }));
          setMessages(restored);
          // marca todas as mensagens como vistas para evitar re-adicionar no polling
          for (const m of parsed.messages) supportSeenRef.current.add(m.id);
        }
        if (parsed?.supportChatId) {
          setSupportChatId(parsed.supportChatId);
        }
        if (parsed?.conversationId) {
          setConversationId(parsed.conversationId);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar histórico do chat:', err);
    }
  }, []);

  // Salva alterações no histórico
  useEffect(() => {
    try {
      const toSave = {
        supportChatId,
        conversationId,
        messages: messages.map(m => ({ ...m, timestamp: m.timestamp.toISOString() })),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (err) {
      console.error('Erro ao salvar histórico do chat:', err);
    }
  }, [messages, supportChatId]);

  // garante que conversationId também dispara salvamento
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const current = raw ? JSON.parse(raw) : {};
      const toSave = {
        ...current,
        supportChatId,
        conversationId,
        messages: messages.map(m => ({ ...m, timestamp: m.timestamp.toISOString() })),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (err) {
      console.error('Erro ao salvar conversationId no histórico do chat:', err);
    }
  }, [conversationId]);

  // salva estado antes de recarregar/navegar
  useEffect(() => {
    const handler = () => {
      try {
        const toSave = {
          supportChatId,
          conversationId,
          messages: messages.map(m => ({ ...m, timestamp: m.timestamp.toISOString() })),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
      } catch (e) {
        // swallow
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [messages, supportChatId, conversationId]);

  // Se o usuário está autenticado, carrega conversas anteriores
  useEffect(() => {
    const loadConversations = async () => {
      if (!session?.user) return;
      try {
                try { showApiBanner('Não foi possível abrir o atendimento no momento.', 'error', 8000); } catch (e) {}
        const res = await fetch('/api/conversations');
        if (res.ok) {
          const data = await res.json();
          setConversations(data || []);
        }
      } catch (err) {
        console.error('Erro ao carregar conversas:', err);
      }
    };
    loadConversations();

    // Connect to socket for realtime conversation updates (conversation created / new message)
    let convoSocket: any = null;
    const setupConvoSocket = async () => {
      try {
        const { io } = await import('socket.io-client');
        const url = process.env.NEXT_PUBLIC_SOCKET_URL;
        if (!url || !session?.user?.id) return;
        convoSocket = io(url, { transports: ['websocket'], reconnectionAttempts: 3 });

        convoSocket.on('connect', () => {
          try { convoSocket.emit('join', session.user.id); } catch (e) {}
        });

        convoSocket.on('conversation_created', (payload: any) => {
          try {
            // prepend new conversation and keep only recent ones
            setConversations((prev) => {
              const next = [payload.conversation || payload, ...prev];
              return next.slice(0, 3);
            });
          } catch (e) {}
        });

        convoSocket.on('conversation_message', (payload: any) => {
          try {
            // payload: { conversationId, message }
            if (!payload) return;
            const { conversationId: cid, message: m } = payload;
            // if currently open conversation, append message to view
            if (cid && conversationId && cid === conversationId) {
              const newMsg: Message = {
                id: m.id || `${Date.now()}-${Math.random()}`,
                type: m.sender === 'user' ? 'user' : 'assistant',
                content: m.senderName ? `${m.senderName}:\n${m.message}` : m.message,
                timestamp: new Date(m.createdAt || Date.now()),
              };
              setMessages((prev) => [...prev, newMsg]);
            }

            // refresh conversations list order
            try { loadConversations(); } catch (e) {}
          } catch (e) {
            console.error('Error handling conversation_message', e);
          }
        });
      } catch (e) {
        // ignore socket setup errors
      }
    };
    setupConvoSocket();

    return () => {
      try { if (convoSocket && convoSocket.disconnect) convoSocket.disconnect(); } catch (e) {}
    };
  }, [session]);

  // Caso localStorage não contenha histórico, tente restaurar do servidor
  useEffect(() => {
    const tryRestoreFromServer = async () => {
      // if we have a conversationId but messages are only the default welcome, fetch from server
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

      // if we have a supportChatId but no support messages loaded, fetch them
      if (supportChatId && messages.length <= 1) {
        try {
          const res = await fetch(`/api/support/chats/${supportChatId}`);
          if (res.ok) {
            const data = await res.json();
            const chat = data.chat;
            const msgs = chat?.messages || [];
            const restored: Message[] = msgs.map((m: any) => ({
              id: m.id,
              type: m.sender === 'attendant' ? 'assistant' : 'user',
              content: m.senderName ? `${m.senderName}:\n${m.message}` : m.message,
              timestamp: new Date(m.createdAt),
            }));
            setMessages(restored);
            for (const m of msgs) supportSeenRef.current.add(m.id);

            // populate participants list from chat response
            try {
              const p: string[] = [];
              if (data.chat?.user?.name) p.push(data.chat.user.name);
              if (data.chat?.attendant?.name) p.push(data.chat.attendant.name);
              // include distinct sender names from messages
              for (const m of msgs) {
                if (m.senderName && !p.includes(m.senderName)) p.push(m.senderName);
              }
              setParticipants(p);
            } catch (e) {
              // ignore
            }
          }
        } catch (e) {
          console.error('Erro ao restaurar atendimento do servidor:', e);
        }
      }
    };
    tryRestoreFromServer();
    // only run once after mount and when conversationId/supportChatId change
  }, [conversationId, supportChatId, session]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle scroll to top to load previous messages
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const handleScroll = async (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollTop > 50) return; // not near top
    if (isLoadingMore) return;

    // decide source (support chat or conversation)
    if (supportChatId) {
      // fetch messages before oldest
      const oldest = messages.find(m => m.type === 'user' || m.type === 'assistant');
      const first = messages[0];
      const before = first ? first.timestamp.toISOString() : new Date().toISOString();
      setIsLoadingMore(true);
      try {
        const res = await fetch(`/api/support/chats/${supportChatId}?before=${encodeURIComponent(before)}&limit=20`);
        if (res.ok) {
          const data = await res.json();
          const older: any[] = data.messages || [];
          if (older.length === 0) return;

          // preserve scroll position
          const prevScrollHeight = el.scrollHeight;

          const newMsgs: Message[] = older.map(m => ({
            id: m.id,
            type: m.sender === 'attendant' ? 'assistant' : 'user',
            content: m.senderName ? `${m.senderName}:\n${m.message}` : m.message,
            timestamp: new Date(m.createdAt),
          }));

          // prepend
          setMessages(prev => [...newMsgs, ...prev]);

          // wait next tick then adjust scrollTop to keep view
          requestAnimationFrame(() => {
            const newScrollHeight = el.scrollHeight;
            el.scrollTop = newScrollHeight - prevScrollHeight + el.scrollTop;
          });
        }
      } catch (err) {
        console.error('Erro ao carregar mensagens anteriores do suporte:', err);
      } finally {
        setIsLoadingMore(false);
      }
    } else if (conversationId) {
      const first = messages[0];
      const before = first ? first.timestamp.toISOString() : new Date().toISOString();
      setIsLoadingMore(true);
      try {
        const res = await fetch(`/api/conversations/${conversationId}?before=${encodeURIComponent(before)}&limit=20`);
        if (res.ok) {
          const data = await res.json();
          const older: any[] = data.messages || [];
          if (older.length === 0) return;
          const prevScrollHeight = el.scrollHeight;
          const newMsgs: Message[] = older.map(m => ({
            id: m.id,
            type: m.sender === 'user' ? 'user' : 'assistant',
            content: m.senderName ? `${m.senderName}:\n${m.message}` : m.message,
            timestamp: new Date(m.createdAt),
          }));
          setMessages(prev => [...newMsgs, ...prev]);
          requestAnimationFrame(() => {
            const newScrollHeight = el.scrollHeight;
            el.scrollTop = newScrollHeight - prevScrollHeight + el.scrollTop;
          });
        }
      } catch (err) {
        console.error('Erro ao carregar mensagens anteriores da conversa:', err);
      } finally {
        setIsLoadingMore(false);
      }
    }
  };

  // Detecta em tempo de renderização se a última mensagem do assistente
  // solicita transferência para humano — garante UI de confirmação visível
  useEffect(() => {
    if (pendingHumanRequest || supportChatId) return;
    if (!messages || messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (!last || last.type !== 'assistant') return;
    const text = String(last.content || '').toLowerCase();
    const patterns = [
      'atendente',
      'atendimento humano',
      'vou te conectar',
      'vou te transferir',
      'conectar com',
      'falar com atendente',
      'fale com um atendente',
      'transferindo',
      'entrar em contato com a equipe',
      'vou te passar para',
    ];
    const found = patterns.some(p => text.includes(p));
    if (found) {
      autoCreateHumanRequest(last.content || 'Solicitação de atendimento humano');
    }
  }, [messages, pendingHumanRequest, supportChatId]);

  // Cria atendimento automaticamente (usado quando assistente solicita transferência)
  const autoCreateHumanRequest = async (initialMsg: string) => {
    if (!initialMsg) return;
    if (supportChatId) return; // já está em atendimento
    if (autoCreatingRef.current) return; // evita chamadas duplicadas
    autoCreatingRef.current = true;
    setIsLoading(true);
    try {
      const payload = {
        userName: session?.user?.name || 'Visitante',
        userEmail: session?.user?.email || undefined,
        subject: 'Solicitação de Atendimento',
        initialMessage: initialMsg,
      };
      // payload prepared

      const supportResponse = await fetch('/api/support/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (supportResponse.ok) {
        const supportData = await supportResponse.json();
        try { setLastApiDebug(JSON.stringify(supportData)); } catch (e) {}
        setSupportChatId(supportData.id);
        supportSeenRef.current.clear();

        const transferMessage: Message = {
          id: (Date.now() + 2).toString(),
          type: 'assistant',
          content: 'Te agradeço pelas informações fornecidas, agora estarei te transferindo para a nossa equipe técnica. 🔧',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, transferMessage]);

        const protocolMessage: Message = {
          id: (Date.now() + 3).toString(),
          type: 'assistant',
          content: `Seu protocolo de atendimento é: ${supportData.id}\n\nEm breve um de nossos atendentes irá te responder.`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, protocolMessage]);

        try { toast.success(`Atendimento iniciado. Protocolo: ${supportData.id}`); } catch (e) {}
        setPendingHumanRequest(null);
        return;
      } else {
        try {
          const err = await supportResponse.json();
          try { setLastApiDebug(JSON.stringify(err)); } catch (e) {}
          const msg = err?.error || 'Erro ao criar atendimento';
          try { toast.error(msg); } catch (e) {}
        } catch (e) {
          try { toast.error('Erro ao criar atendimento'); } catch (e) {}
          try { setLastApiDebug('unknown error'); } catch (e) {}
        }
      }
    } catch (error) {
      console.error('Erro ao auto criar abertura de suporte:', error);
      try { toast.error('Erro ao criar atendimento. Tente novamente.'); } catch (e) {}
      try { setLastApiDebug(String(error)); } catch (e) {}
    } finally {
      autoCreatingRef.current = false;
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    // se o usuário escreveu pedindo atendimento humano, abre o ticket imediatamente
    const detectHumanRequestInput = (text?: string) => {
      if (!text) return false;
      const t = text.toLowerCase();
      const patterns = [
        'atendente',
        'atendimento humano',
        'vou te conectar',
        'vou te transferir',
        'conectar com',
        'falar com atendente',
        'fale com um atendente',
        'transferindo',
        'entrar em contato com a equipe',
        'vou te passar para',
        'preciso falar com',
        'quero falar com um atendente',
        'continuar o atendimento',
        'continuar atendimento',
        'gostaria de continuar',
        'quero continuar',
        'abrir atendimento',
        'abrir chamado',
      ];
      return patterns.some(p => t.includes(p));
    };

    try {
      if (!supportChatId && detectHumanRequestInput(userMessage.content)) {
        try {
          const payload = {
            userName: session?.user?.name || 'Visitante',
            userEmail: session?.user?.email || undefined,
            subject: 'Solicitação de Atendimento',
            initialMessage: userMessage.content,
          };

          const supportResponse = await fetch('/api/support/chats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (supportResponse.ok) {
            const supportData = await supportResponse.json();
            setSupportChatId(supportData.id);
            supportSeenRef.current.clear();

            const protocolMessage: Message = {
              id: (Date.now() + 3).toString(),
              type: 'assistant',
              content: `Seu protocolo de atendimento é: ${supportData.id}\n\nEm breve um de nossos atendentes irá te responder.`,
              timestamp: new Date(),
            };
            setMessages(prev => [...prev, protocolMessage]);
            try { toast.success(`Atendimento iniciado. Protocolo: ${supportData.id}`); } catch (e) {}
            setIsLoading(false);
            return;
          } else {
            try {
              const err = await supportResponse.json();
              const msg = err?.error || 'Erro ao criar atendimento';
              try { toast.error(msg); } catch (e) {}
            } catch (e) {
              try { toast.error('Erro ao criar atendimento'); } catch (e) {}
            }
            setIsLoading(false);
            return;
          }
        } catch (e) {
          console.error('Erro ao criar atendimento a partir do input do usuário:', e);
          try { toast.error('Erro ao criar atendimento. Tente novamente.'); } catch (er) {}
          setIsLoading(false);
          return;
        }
      }
    
    
      // Se estivermos em um atendimento humano, enviar direto ao ticket
      if (supportChatId) {
        // envia e obtém o id criado pelo servidor para evitar duplicação
        try {
          const serverMsgId = await sendSupportMessage(supportChatId, input);
          if (serverMsgId) {
            // substitui o id temporário pela id do servidor e marca como vista
            setMessages(prev => prev.map(m => m.id === userMessage.id ? { ...m, id: serverMsgId } : m));
            supportSeenRef.current.add(serverMsgId);
          }
        } catch (e) {
          console.error('Erro no envio para suporte:', e);
        }
        setIsLoading(false);
        return;
      }

      // Se usuário autenticado e histórico no servidor, salva/encaminha para Conversation
      if (session?.user) {
        // se ainda não existe conversationId, cria uma
        if (!conversationId) {
          const res = await fetch('/api/conversations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: 'Chat com Assistente', initialMessage: input, senderName: session.user.name }),
          });

          if (res.ok) {
            const convo = await res.json();
            setConversationId(convo.id);
            // atualiza lista localmente (o socket irá propagar updates em seguida)
            try {
              setConversations(prev => [convo, ...prev].slice(0, 3));
            } catch (e) {
              console.error('Erro ao atualizar lista de conversas localmente:', e);
            }

            // Depois de criar a conversa, ainda chamamos o endpoint do assistente
            // para obter a resposta imediata e exibi-la ao usuário.
            try {
              const assistantRes = await fetch(apiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: input, conversationId: convo.id }),
              });
              if (assistantRes.ok) {
                const data: AssistantResponse = await assistantRes.json();
                const assistantMessage: Message = {
                  id: (Date.now() + 1).toString(),
                  type: 'assistant',
                  content: data.answer,
                  timestamp: new Date(),
                  data: data.data,
                  aiPowered: data.aiPowered,
                };
                setMessages(prev => [...prev, assistantMessage]);

                // tenta persistir a resposta do assistente na conversa do servidor
                try {
                  await fetch(`/api/conversations/${convo.id}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: data.answer, sender: 'assistant', senderName: 'Assistente' }),
                  });
                } catch (e) {
                  console.error('Erro ao persistir resposta do assistente na conversa:', e);
                }
              }
            } catch (e) {
              console.error('Erro ao obter resposta do assistente após criar conversa:', e);
            }

            setIsLoading(false);
            return;
          }
        } else {
          // envia mensagem para conversa existente
          const postRes = await fetch(`/api/conversations/${conversationId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: input, sender: 'user', senderName: session.user.name }),
          });
          if (postRes.ok) {
            try {
              // move conversa para topo localmente; socket também notificará outros dispositivos
              setConversations(prev => {
                const without = prev.filter(c => c.id !== conversationId);
                const found = prev.find(c => c.id === conversationId);
                const updated = found ? { ...found, _count: { ...(found._count || {}), messages: ((found._count && found._count.messages) || 0) + 1 } } : { id: conversationId, title: 'Chat com Assistente', _count: { messages: 1 } };
                return [updated, ...without].slice(0, 3);
              });
            } catch (e) {
              console.error('Erro ao atualizar lista de conversas localmente após postar:', e);
            }
          }
          // Mesmo com conversa existente, solicita resposta do assistente
          try {
            const assistantRes = await fetch(apiEndpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ question: input, conversationId }),
            });
            if (assistantRes.ok) {
              const data: AssistantResponse = await assistantRes.json();
              const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                type: 'assistant',
                content: data.answer,
                timestamp: new Date(),
                data: data.data,
                aiPowered: data.aiPowered,
              };
              setMessages(prev => [...prev, assistantMessage]);

              // tenta também persistir a resposta do assistente no servidor
              try {
                await fetch(`/api/conversations/${conversationId}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ message: data.answer, sender: 'assistant', senderName: 'Assistente' }),
                });
              } catch (e) {
                console.error('Erro ao persistir resposta do assistente na conversa existente:', e);
              }
            }
          } catch (e) {
            console.error('Erro ao obter resposta do assistente para conversa existente:', e);
          }

          setIsLoading(false);
          return;
        }
      }
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: input }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Se IA não está configurada, tenta fallback
        if (response.status === 503 && errorData.fallback) {
          const fallbackResponse = await fetch(errorData.fallback, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question: input }),
          });
          
          const fallbackData = await fallbackResponse.json();
          const fallbackMessage: Message = {
            id: (Date.now() + 1).toString(),
            type: 'assistant',
            content: `⚠️ IA não configurada. Usando assistente padrão:\n\n${fallbackData.answer}`,
            timestamp: new Date(),
            data: fallbackData.data,
          };
          setMessages(prev => [...prev, fallbackMessage]);
          setIsLoading(false);
          return;
        }
        
        throw new Error('Erro na resposta');
      }

      const data: AssistantResponse = await response.json();

      // Se foi solicitado atendimento humano: não cria ticket automaticamente
      // em vez disso, mostra um pedido pendente para o usuário confirmar.
      if (data.type === 'request_human' && data.data?.requestSupport) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: data.answer,
          timestamp: new Date(),
          data: data.data,
        };
        setMessages(prev => [...prev, assistantMessage]);
        // grava a intenção de abertura de atendimento para confirmação do usuário
        setPendingHumanRequest(userMessage?.content || 'Solicitação de atendimento humano');

        setIsLoading(false);
        return;
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: data.answer,
        timestamp: new Date(),
        data: data.data,
        aiPowered: data.aiPowered,
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Fallback: detect phrases that indicate the assistant is requesting a human
      const detectHumanRequest = (text?: string) => {
        if (!text) return false;
        const t = text.toLowerCase();
        const patterns = [
          'atendente',
          'atendimento humano',
          'vou te conectar',
          'vou te transferir',
          'conectar com',
          'falar com atendente',
          'fale com um atendente',
          'transferindo',
          'entrar em contato com a equipe',
          'vou te passar para',
        ];
        return patterns.some(p => t.includes(p));
      };

      if (detectHumanRequest(data.answer) || detectHumanRequest(String(data?.data))) {
        // grava a intenção para confirmação do usuário — use o conteúdo da mensagem enviada
        setPendingHumanRequest(userMessage?.content || 'Solicitação de atendimento humano');
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'Desculpe, ocorreu um erro. Por favor, tente novamente.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      try {
        // attempt to focus the input so user can continue typing
        if (inputRef && inputRef.current) {
          inputRef.current.focus();
        } else {
          const el = document.querySelector('input[placeholder="Digite sua pergunta..."]') as HTMLInputElement | null;
          el?.focus();
        }
      } catch (e) {
        // swallow
      }
    }
  };

  // Inicializa histórico do chat de suporte; atualizações em tempo real vêm via socket
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

        // Adiciona apenas mensagens novas
        const newMsgs: Message[] = [];
        for (const m of msgs) {
          if (supportSeenRef.current.has(m.id)) continue;
          supportSeenRef.current.add(m.id);

          if (m.sender === 'attendant') {
            newMsgs.push({
              id: m.id,
              type: 'assistant',
              content: `${m.senderName}:\n${m.message}`,
              timestamp: new Date(m.createdAt),
            });
          } else {
            newMsgs.push({
              id: m.id,
              type: 'user',
              content: m.message,
              timestamp: new Date(m.createdAt),
            });
          }
        }

        if (mounted && newMsgs.length > 0) {
          setMessages(prev => [...prev, ...newMsgs]);
        }

        // Se o chat foi finalizado, criamos uma nova conversa para continuidade
        if (chat && (chat.status === 'CLOSED' || chat.status === 'RESOLVED')) {
          const finalId = `support-final-${chat.id}`;
          if (!supportSeenRef.current.has(finalId)) {
            supportSeenRef.current.add(finalId);
            const finalMsg: Message = {
              id: finalId,
              type: 'assistant',
              content: 'Este atendimento foi finalizado. Caso precise, abra um novo atendimento.',
              timestamp: new Date(),
            };
            setMessages(prev => [...prev, finalMsg]);
          }

          try {
            const payload = {
              title: 'Chat com Assistente',
              initialMessage: `O atendimento ${chat.id} foi finalizado pelo atendente. Criei uma nova conversa para você continuar.`,
              senderName: session?.user?.name || 'Visitante',
            };
            const convoRes = await fetch('/api/conversations', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
            if (convoRes.ok) {
              const convo = await convoRes.json();
              setConversationId(convo.id);
              try {
                setMessages(prev => [...prev, { id: `conv-created-${convo.id}`, type: 'assistant', content: `Criei uma nova conversa (protocolo: ${convo.id}).`, timestamp: new Date() }]);
              } catch (e) {}
              try {
                setConversations(prev => [convo, ...prev].slice(0, 3));
              } catch (e) {}
            }
          } catch (e) {
            console.error('Erro ao criar conversation após atendimento fechado:', e);
          }

          // reset support chat id to stop listening in UI
          setSupportChatId(null);
        }
      } catch (err) {
        console.error('Erro ao buscar mensagens do suporte:', err);
      }
    };

    // fetch imediato; realtime updates come via socket
    fetchMessages();
    return () => { mounted = false; };
  }, [supportChatId]);

  // Real-time updates via Socket.IO when connected to a support chat
  useEffect(() => {
    if (!supportChatId) return;
    let socket: any = null;
    let mounted = true;

    const connectSocket = async () => {
      try {
        const { io } = await import('socket.io-client');
        const url = process.env.NEXT_PUBLIC_SOCKET_URL;
        if (!url) return;
        socket = io(url, { transports: ['websocket'], reconnectionAttempts: 3 });

        socket.on('connect', () => {
          try { socket.emit('join', supportChatId); } catch (e) {}
        });

        socket.on('new_message', (payload: any) => {
          try {
            const m = payload?.message;
            if (!m) return;
            // avoid duplicates
            if (m.id && supportSeenRef.current.has(m.id)) return;
            if (m.id) supportSeenRef.current.add(m.id);

            const newMsg: Message = m.sender === 'attendant'
              ? { id: m.id || `assist-${Date.now()}`, type: 'assistant', content: `${m.senderName || 'Assistente'}:\n${m.message}`, timestamp: new Date(m.createdAt || Date.now()) }
              : { id: m.id || `user-${Date.now()}`, type: 'user', content: m.message, timestamp: new Date(m.createdAt || Date.now()) };

            if (mounted) setMessages(prev => [...prev, newMsg]);
          } catch (e) {
            console.error('Error handling new_message', e);
          }
        });

        socket.on('connect_error', (err: any) => {
          console.warn('chat-assistant socket connect_error', err);
        });
      } catch (e) {
        // dynamic import or connection failed
      }
    };

    connectSocket();

    return () => {
      mounted = false;
      try { if (socket && socket.disconnect) socket.disconnect(); } catch (e) {}
    };
  }, [supportChatId]);

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

  // Envio de mensagem quando conectado a um chat humano
  async function sendSupportMessage(chatId: string, text: string) {
    // já adicionamos a mensagem do usuário localmente em handleSend
    try {
      const res = await fetch(`/api/support/chats/${chatId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });

      if (res.ok) {
        // polling irá buscar a nova mensagem — tenta obter id retornado para evitar duplicação
        try {
          const data = await res.json();
          // espera formatos comuns: { id: '...', message: { id: '...' } }
          return data?.id || data?.message?.id || data?.messageId || null;
        } catch (e) {
          return null;
        }
      } else {
        try {
          const body = await res.text();
          console.error('sendSupportMessage failed', res.status, body);
          try { toast.error('Erro ao enviar mensagem ao suporte'); } catch (e) {}
        } catch (e) {
          console.error('sendSupportMessage failed and body parse failed', e);
        }
        return null;
      }
    } catch (err) {
      console.error('Erro ao enviar mensagem de suporte:', err);
    }
    return null;
  };

  // confirma abertura de atendimento humano (chamada pelo usuário)
  const confirmHumanRequest = async () => {
    if (!pendingHumanRequest) return;
    setIsLoading(true);
    try {
      const payload = {
        userName: session?.user?.name || 'Visitante',
        userEmail: session?.user?.email || undefined,
        subject: 'Solicitação de Atendimento',
        initialMessage: pendingHumanRequest,
      };
      // confirm payload prepared

      const supportResponse = await fetch('/api/support/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (supportResponse.ok) {
        const supportData = await supportResponse.json();
        try { setLastApiDebug(JSON.stringify(supportData)); } catch (e) {}
        setSupportChatId(supportData.id);
        supportSeenRef.current.clear();

        const transferMessage: Message = {
          id: (Date.now() + 2).toString(),
          type: 'assistant',
          content: 'Te agradeço pelas informações fornecidas, agora estarei te transferindo para a nossa equipe técnica. 🔧',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, transferMessage]);

        const protocolMessage: Message = {
          id: (Date.now() + 3).toString(),
          type: 'assistant',
          content: `Seu protocolo de atendimento é: ${supportData.id}\n\nEm breve um de nossos atendentes irá te responder.`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, protocolMessage]);

        try { toast.success(`Atendimento iniciado. Protocolo: ${supportData.id}`); } catch (e) {}
        setPendingHumanRequest(null);
        setIsLoading(false);
        return;
      } else {
        try {
          const text = await supportResponse.text();
          try { setLastApiDebug(text); } catch (e) {}
          console.error('confirmHumanRequest failed', supportResponse.status, text);
          try { toast.error('Erro ao criar atendimento: ' + (supportResponse.status || '')); } catch (e) {}
        } catch (e) {
          console.error('confirmHumanRequest unknown error', e);
          try { toast.error('Erro ao criar atendimento'); } catch (er) {}
        }
      }
    } catch (error) {
      console.error('Erro ao confirmar abertura de suporte:', error);
      try { toast.error('Erro ao criar atendimento. Tente novamente.'); } catch (e) {}
      try { setLastApiDebug(String(error)); } catch (e) {}
    } finally {
      if (pendingHumanRequest) {
        const errorMsg: Message = {
          id: (Date.now() + 5).toString(),
          type: 'assistant',
          content: 'Não foi possível abrir o atendimento no momento. Tente novamente mais tarde.',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMsg]);
        try { toast.error('Não foi possível abrir o atendimento no momento.'); } catch (e) {}
      }
      setIsLoading(false);
    }
  };

  const cancelHumanRequest = () => {
    setPendingHumanRequest(null);
  };

  const toggleAssistantMode = () => {
    const newMode = assistantMode === 'smart' ? 'ai' : 'smart';
    setAssistantMode(newMode);
    setShowSettings(false);
    
    const modeMessage: Message = {
      id: (Date.now() + 2).toString(),
      type: 'assistant',
      content: newMode === 'ai' 
        ? '🤖 Modo IA ativado! Agora estou usando inteligência artificial para respostas mais naturais e contextuais.'
        : '⚡ Modo Smart ativado! Usando sistema de busca rápida e respostas estruturadas.',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, modeMessage]);
  };

  const [copiedProtocol, setCopiedProtocol] = useState(false);
  const [lastApiDebug, setLastApiDebug] = useState<string | null>(null);
  const [apiBanner, setApiBanner] = useState<{ type: 'info' | 'success' | 'error'; text: string } | null>(null);

  const showApiBanner = (text: string, type: 'info' | 'success' | 'error' = 'info', duration = 5000) => {
    setApiBanner({ type, text });
    if (duration > 0) {
      setTimeout(() => setApiBanner(null), duration);
    }
  };

  const copyProtocol = async () => {
    if (!supportChatId) return;
    try {
      await navigator.clipboard.writeText(supportChatId);
      setCopiedProtocol(true);
      setTimeout(() => setCopiedProtocol(false), 2000);
    } catch (e) {
      console.error('Erro ao copiar protocolo:', e);
    }
  };

  return (
    <>
      {/* Botão flutuante */}
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

      {/* Janela de chat */}
      {isOpen && (
        <Card className={`fixed bottom-6 right-6 w-[320px] sm:w-[360px] md:w-[400px] max-h-[calc(100vh-48px)] flex flex-col shadow-2xl border-2 ${assistantMode === 'smart' ? 'h-[420px] md:h-[520px]' : 'h-[500px] md:h-[600px]'}`} style={{ zIndex: 2147483647 }}>
          {/* Header */}
          <div className={`flex items-center justify-between p-4 border-b text-white rounded-t-lg ${
            assistantMode === 'ai' ? 'bg-purple-600' : 'bg-blue-600'
          }`}>
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
                      <span className="text-xs bg-white/10 px-2 py-1 rounded text-white">Protocolo: {supportChatId}</span>
                      <button
                        onClick={copyProtocol}
                        className="text-xs underline text-white/90"
                        aria-label="Copiar protocolo"
                      >
                        {copiedProtocol ? 'Copiado!' : 'Copiar'}
                      </button>
                      {/* Participantes e criação de chamado com participantes removidos — apenas protocolo visível */}
                    </div>
                  )}
                  {/* Conversas selecionáveis removidas — apenas protocolo é necessário */}
              </div>
            </div>
            <div className="flex items-center gap-1">
              {/* <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSettings(!showSettings)}
                className="text-white hover:bg-blue-700 h-8 w-8"
              >
                <Settings className="h-4 w-4" />
              </Button> */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className={`text-white h-8 w-8 ${
                  assistantMode === 'ai' ? 'hover:bg-purple-700' : 'hover:bg-blue-700'
                }`}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
          {apiBanner && (
            <div className={`p-3 text-sm ${apiBanner.type === 'success' ? 'bg-green-50 text-green-800' : apiBanner.type === 'error' ? 'bg-red-50 text-red-800' : 'bg-blue-50 text-blue-800'}`}>
              {apiBanner.text}
            </div>
          )}

          {/* Settings Panel */}
          {showSettings && (
            <div className="p-4 border-b bg-gray-50">
              <p className="text-sm font-medium mb-2">Modo do Assistente:</p>
              <div className="space-y-2">
                <button
                  onClick={() => assistantMode !== 'smart' && toggleAssistantMode()}
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
                  onClick={() => assistantMode !== 'ai' && toggleAssistantMode()}
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
          )}

          {/* Messages */}
          <div ref={messagesContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map(message => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.type === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border shadow-sm'
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                  
                  {/* Badge para mensagens com IA */}
                  {message.type === 'assistant' && message.aiPowered && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-purple-600">
                      <Sparkles className="h-3 w-3" />
                      <span>Powered by AI</span>
                    </div>
                  )}
                  
                  {/* Renderiza produtos se houver */}
                  {message.data && Array.isArray(message.data) && message.data.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {message.data.map((product: any) => (
                        <button
                          key={product.id}
                          onClick={() => handleProductClick(product)}
                          className="w-full text-left p-2 bg-gray-50 hover:bg-gray-100 rounded border text-sm transition-colors"
                        >
                          <div className="font-medium text-gray-900">{product.name}</div>
                          <div className="text-xs text-gray-600 mt-1">
                            {product.category?.name} • R$ {(product.promotionalPrice ?? product.price).toFixed(2)}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  
                  <div className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString('pt-BR', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                </div>
              </div>
            ))}
            {pendingHumanRequest && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-lg p-3 bg-white border shadow-sm">
                  <div className="text-sm whitespace-pre-wrap">Deseja abrir um atendimento humano com a mensagem abaixo?</div>
                  <div className="mt-2 p-2 bg-gray-100 rounded text-sm whitespace-pre-wrap">{pendingHumanRequest}</div>
                  <div className="mt-3 flex gap-2">
                    <Button onClick={() => { confirmHumanRequest(); }} size="sm">Confirmar atendimento humano</Button>
                    <Button variant="outline" size="sm" onClick={() => { cancelHumanRequest(); }}>Cancelar</Button>
                  </div>
                </div>
              </div>
            )}

            {/* {lastApiDebug && (
              <div className="p-2">
                <div className="text-xs text-gray-500 mb-1">Debug API:</div>
                <pre className="max-h-24 overflow-auto text-xs bg-black/5 p-2 rounded">{lastApiDebug}</pre>
              </div>
            )} */}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border shadow-sm rounded-lg p-3">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t bg-white">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Digite sua pergunta..."
                disabled={isLoading}
                className="flex-1"
                maxLength={500}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
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
                : '⚡ Modo Smart • Respostas rápidas'
              }
            </p>
          </div>
        </Card>
      )}
    </>
  );
}
