"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AtendimentoChatList, type SupportChatSummary } from "@/components/admin/atendimento-chat-list";
import { AtendimentoChatPanel, type SelectedSupportChat, type SupportMessage } from "@/components/admin/atendimento-chat-panel";

interface SupportChat extends SupportChatSummary {
  messages: SupportMessage[];
  assignedTo?: string;
  updatedAt: string;
}

export default function AtendimentoPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [chats, setChats] = useState<SupportChat[]>([]);
  const [selectedChat, setSelectedChat] = useState<SelectedSupportChat | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [copiedProtocol, setCopiedProtocol] = useState(false);
  const [protocolQuery, setProtocolQuery] = useState<string>("");

  // ─── Auth guard ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") { router.push("/auth/login"); return; }
    if (session?.user?.role !== "ADMIN" && session?.user?.role !== "OWNER") { router.push("/"); return; }
    loadChats();
  }, [session, status, router, filterStatus]);

  // ─── Polling para atualizar chat selecionado ─────────────────────────────
  useEffect(() => {
    if (!selectedChat?.id) return;
    const id = selectedChat.id;
    const timer = setInterval(() => {
      loadChatMessages(id);
      loadChats();
    }, 5000);
    return () => clearInterval(timer);
  }, [selectedChat?.id]);

  // ─── Auto-scroll ──────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const el = messagesContainerRef.current;
      if (!el) return;
      requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
    } catch { /* swallow */ }
  }, [selectedChat?.messages?.length, selectedChat?.id]);

  // ─── Data fetching ────────────────────────────────────────────────────────
  const loadChats = async () => {
    try {
      const response = await fetch("/api/support/chats");
      if (response.ok) {
        const data = await response.json();
        const all = (Array.isArray(data) ? data : data.chats || []) as SupportChat[];
        if (filterStatus === "all") {
          setChats(all.filter((c) => c.status === "OPEN" || c.status === "IN_PROGRESS"));
        } else if (filterStatus === "OPEN") {
          setChats(all.filter((c) => c.status === "OPEN"));
        } else if (filterStatus === "IN_PROGRESS") {
          setChats(all.filter((c) => c.status === "IN_PROGRESS"));
        } else if (filterStatus === "closed") {
          setChats(all.filter((c) => c.status === "CLOSED" || c.status === "RESOLVED"));
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

  // ─── Actions ──────────────────────────────────────────────────────────────
  const copyProtocol = async (protocol?: string) => {
    if (!protocol) return;
    try {
      await navigator.clipboard.writeText(protocol);
      setCopiedProtocol(true);
      setTimeout(() => setCopiedProtocol(false), 2000);
    } catch { /* ignore */ }
  };

  const sendMessage = async () => {
    if (!message.trim() || !selectedChat) return;
    setSendingMessage(true);
    try {
      const response = await fetch(`/api/support/chats/${selectedChat.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim(), asAttendant: true }),
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
      try { inputRef.current?.focus(); } catch { /* ignore */ }
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
        if (selectedChat?.id === chatId) await loadChatMessages(chatId);
      }
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
    }
  };

  const assumeChat = async (chatId: string) => {
    try {
      const response = await fetch(`/api/support/chats/${chatId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Olá! Seu número de protocolo é **ATD-${chatId.slice(-8).toUpperCase()}**. Guarde-o para consultas futuras. Como posso te ajudar?`,
          asAttendant: true,
        }),
      });
      if (response.ok) {
        await loadChats();
        await loadChatMessages(chatId);
      }
    } catch (error) {
      console.error("Erro ao assumir chat:", error);
    }
  };

  // ─── Display helpers ──────────────────────────────────────────────────────
  const detectHumanRequestInMessages = (msgs: SupportMessage[] = []) => {
    const PATTERNS = ["atendente", "atendimento humano", "falar com atendente", "fale com um atendente", "quero falar com", "preciso falar com"];
    return msgs
      .filter((m) => m.sender === "customer" || m.sender === "user")
      .some((m) => PATTERNS.some((p) => m.message.toLowerCase().includes(p)));
  };

  const isBotChat = (chat: SupportChat) => {
    if (!chat || chat.status !== "OPEN") return false;
    const hasAttendant = Boolean(chat.attendant) || (chat.messages || []).some((m) => m.sender === "attendant");
    return !hasAttendant && !detectHumanRequestInMessages(chat.messages || []);
  };

  const getStatusBadge = (chat: any) => {
    if (isBotChat(chat)) return <Badge className="bg-indigo-600 text-white">Bot</Badge>;
    const CONFIG = {
      BOT: { label: "Bot", color: "bg-indigo-600" },
      OPEN: { label: "Aberto", color: "bg-red-500" },
      IN_PROGRESS: { label: "Em Progresso", color: "bg-yellow-500" },
      RESOLVED: { label: "Resolvido", color: "bg-green-500" },
      CLOSED: { label: "Fechado", color: "bg-gray-500" },
    } as const;
    const cfg = CONFIG[chat.status as keyof typeof CONFIG] || CONFIG.OPEN;
    return <Badge className={cfg.color + " text-white"}>{cfg.label}</Badge>;
  };

  const displayedChats = useMemo(() => {
    const q = protocolQuery.trim().toLowerCase();
    let filtered = q
      ? chats.filter((c) =>
          (c.id || "").toLowerCase().includes(q) ||
          ((c.user?.email || c.userEmail || "") as string).toLowerCase().includes(q) ||
          ((c.user?.name || c.userName || "") as string).toLowerCase().includes(q)
        )
      : [...chats];

    if (filterStatus === "bot") {
      filtered = filtered.filter((c) => isBotChat(c) || c.status === "BOT");
    } else if (filterStatus === "active") {
      filtered = filtered.filter((c) => c.status === "OPEN" && !isBotChat(c));
    } else if (filterStatus === "all") {
      filtered = filtered.filter((c) => (c.status === "OPEN" || c.status === "IN_PROGRESS") && !isBotChat(c));
    } else if (filterStatus === "IN_PROGRESS") {
      filtered = filtered.filter((c) => c.status === "IN_PROGRESS" && !isBotChat(c));
    } else if (filterStatus === "closed") {
      filtered = filtered.filter((c) => c.status === "CLOSED" || c.status === "RESOLVED");
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
      {/* Page header */}
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
            <Button size="sm" variant="outline" onClick={() => setProtocolQuery("")}>
              Limpar
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AtendimentoChatList
          chats={displayedChats}
          selectedChatId={selectedChat?.id || null}
          filterStatus={filterStatus}
          onFilterChange={setFilterStatus}
          onSelectChat={loadChatMessages}
          getStatusBadge={getStatusBadge}
        />

        <AtendimentoChatPanel
          chat={selectedChat}
          message={message}
          isSending={sendingMessage}
          copiedProtocol={copiedProtocol}
          messagesContainerRef={messagesContainerRef}
          inputRef={inputRef}
          getStatusBadge={getStatusBadge}
          onMessageChange={setMessage}
          onSend={sendMessage}
          onKeyPress={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
          }}
          onAssumeChat={assumeChat}
          onUpdateStatus={updateChatStatus}
          onCopyProtocol={copyProtocol}
        />
      </div>
    </div>
  );
}
