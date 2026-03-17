'use client';

import logger from "@/lib/logger";
import { useEffect, useState } from 'react';
import { Bot, Sparkles } from "lucide-react";

type MelhorEnvioStatus = {
  connected: boolean;
  environment?: "sandbox" | "production";
  expiresAt?: string | null;
  scope?: string | null;
};

type MercadoPagoStatus = {
  connected: boolean;
  environment?: "sandbox" | "production";
  updatedAt?: string | null;
};

type SiteConfig = {
  assistantMode: "smart" | "ai";
};

export default function AdminSettingsPage() {
  const [meStatus, setMeStatus] = useState<MelhorEnvioStatus | null>(null);
  const [mpStatus, setMpStatus] = useState<MercadoPagoStatus | null>(null);
  const [siteConfig, setSiteConfig] = useState<SiteConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [mpConfigLoading, setMpConfigLoading] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);
  const [showMpForm, setShowMpForm] = useState(false);
  const [mpForm, setMpForm] = useState({ publicKey: "", accessToken: "" });
  const [webhookSending, setWebhookSending] = useState(false);
  const [webhookFeedback, setWebhookFeedback] = useState<string | null>(null);
  const [socketStatus, setSocketStatus] = useState<"checking" | "connected" | "disconnected" | "error">("checking");
  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "";

  // Carregar status das integrações
  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);

        // Melhor Envio
        const meRes = await fetch("/api/admin/integrations/melhor-envio/status", { cache: "no-store" });
        if (meRes.ok) {
          setMeStatus(await meRes.json());
        } else {
          setMeStatus({ connected: false });
        }

        // Mercado Pago
        const mpRes = await fetch("/api/admin/integrations/mercado-pago/status", { cache: "no-store" });
        if (mpRes.ok) {
          setMpStatus(await mpRes.json());
        } else {
          setMpStatus({ connected: false });
        }

        // Site Config
        const configRes = await fetch("/api/admin/site-config", { cache: "no-store" });
        if (configRes.ok) {
          setSiteConfig(await configRes.json());
        } else {
          setSiteConfig({ assistantMode: "smart" });
        }
      } catch {
        setMeStatus({ connected: false });
        setMpStatus({ connected: false });
        setSiteConfig({ assistantMode: "smart" });
      } finally {
        setLoading(false);
      }
    };
    run();
    // quick socket status check
    (async () => {
      if (!socketUrl) {
        setSocketStatus("disconnected");
        return;
      }
      setSocketStatus("checking");
      try {
        const mod = await import("socket.io-client");
        const { io } = mod;
        const sock = io(socketUrl, { transports: ["websocket"], reconnection: false, timeout: 3000 });
        const onConnect = () => {
          setSocketStatus("connected");
          sock.close();
        };
        const onError = () => {
          setSocketStatus("error");
          sock.close();
        };
        sock.once("connect", onConnect);
        sock.once("connect_error", onError);
        // safety timeout
        setTimeout(() => {
          if (socketStatus === "checking") {
            setSocketStatus("disconnected");
            try {
              sock.close();
            } catch {}
          }
        }, 3500);
      } catch (e) {
        setSocketStatus("error");
      }
    })();
  }, []);

  // Salvar configuração do Mercado Pago
  const handleSaveMercadoPago = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setMpConfigLoading(true);
      const res = await fetch("/api/admin/integrations/mercado-pago/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicKey: mpForm.publicKey,
          accessToken: mpForm.accessToken,
          environment: "sandbox",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMpStatus(data);
        setShowMpForm(false);
        setMpForm({ publicKey: "", accessToken: "" });
      } else {
        alert("Erro ao salvar configuração");
      }
    } catch (error) {
      alert('Erro ao salvar configuração');
      logger.error(error);
    } finally {
      setMpConfigLoading(false);
    }
  };

  const handleSendWebhookTest = async () => {
    try {
      setWebhookFeedback(null);
      setWebhookSending(true);
      const res = await fetch("/api/admin/integrations/webhook/test", { method: "POST" });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setWebhookFeedback(data?.error || "Erro ao enviar webhook de teste");
        return;
      }

      setWebhookFeedback(data?.message || "Webhook de teste enviado");
    } catch (error) {
      logger.error(error);
      setWebhookFeedback('Erro ao enviar webhook de teste');
    } finally {
      setWebhookSending(false);
    }
  };

  const handleUpdateAssistantMode = async (mode: "smart" | "ai") => {
    try {
      setConfigLoading(true);
      const res = await fetch("/api/admin/site-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assistantMode: mode }),
      });

      if (res.ok) {
        const data = await res.json();
        setSiteConfig(data);
        alert("Modo do assistente atualizado com sucesso!");
      } else {
        alert("Erro ao atualizar configuração");
      }
    } catch (error) {
      alert("Erro ao atualizar configuração");
      console.error(error);
    } finally {
      setConfigLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Configurações</h1>

      <div className="space-y-6">
        {/* Configuração do Assistente Virtual */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Assistente Virtual</h2>
          <p className="text-sm text-gray-600 mb-4">Escolha qual modo do assistente virtual será usado pelos clientes no chat.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button onClick={() => handleUpdateAssistantMode("smart")} disabled={configLoading || siteConfig?.assistantMode === "smart"} className={`p-4 border-2 rounded-lg text-left transition-all ${siteConfig?.assistantMode === "smart" ? "border-blue-600 bg-blue-50" : "border-gray-200 hover:border-blue-300"} disabled:opacity-50`}>
              <div className="flex items-start gap-3">
                <Bot className="h-6 w-6 text-blue-600 mt-1" />
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">Smart Assistant</h3>
                  <p className="text-sm text-gray-600 mb-2">Respostas rápidas e estruturadas baseadas em regras</p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded">Grátis</span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">Rápido</span>
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded">Offline</span>
                  </div>
                </div>
                {siteConfig?.assistantMode === "smart" && <div className="text-blue-600 font-semibold">✓ Ativo</div>}
              </div>
            </button>

            <button onClick={() => handleUpdateAssistantMode("ai")} disabled={configLoading || siteConfig?.assistantMode === "ai"} className={`p-4 border-2 rounded-lg text-left transition-all ${siteConfig?.assistantMode === "ai" ? "border-purple-600 bg-purple-50" : "border-gray-200 hover:border-purple-300"} disabled:opacity-50`}>
              <div className="flex items-start gap-3">
                <Sparkles className="h-6 w-6 text-purple-600 mt-1" />
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">AI Assistant</h3>
                  <p className="text-sm text-gray-600 mb-2">Respostas naturais e contextuais powered by OpenAI</p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded">Pago</span>
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded">Natural</span>
                    <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded">Requer API</span>
                  </div>
                </div>
                {siteConfig?.assistantMode === "ai" && <div className="text-purple-600 font-semibold">✓ Ativo</div>}
              </div>
            </button>
          </div>

          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
            <p className="font-medium text-yellow-900">ℹ️ Importante:</p>
            <p className="text-yellow-800 mt-1">
              Para usar o <strong>AI Assistant</strong>, configure a variável <code className="bg-yellow-100 px-1 rounded">OPENAI_API_KEY</code> no arquivo .env
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Informações da Loja</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Loja</label>
              <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Shopping das Ferramentas" disabled />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email de Contato</label>
              <input type="email" className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="contato@loja.com" disabled />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Mercado Pago / Pagamento</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p className="text-base font-medium">{loading ? "Verificando…" : mpStatus?.connected ? "Conectado" : "Desconectado"}</p>
              </div>
              <button onClick={() => setShowMpForm(!showMpForm)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                {mpStatus?.connected ? "Atualizar" : "Configurar"} Mercado Pago
              </button>
            </div>

            {mpStatus?.connected && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-600">Ambiente</p>
                  <p className="font-medium">{mpStatus.environment}</p>
                </div>
                <div>
                  <p className="text-gray-600">Atualizado em</p>
                  <p className="font-medium">{mpStatus.updatedAt ? new Date(mpStatus.updatedAt).toLocaleString() : "—"}</p>
                </div>
              </div>
            )}

            {showMpForm && (
              <form onSubmit={handleSaveMercadoPago} className="mt-4 p-4 bg-gray-50 rounded space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Public Key (Chave Pública)</label>
                  <input type="text" placeholder="TEST-xxxxxxxxxxxxxxxxxxxxxxxx" value={mpForm.publicKey} onChange={(e) => setMpForm({ ...mpForm, publicKey: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" required />
                  <p className="text-xs text-gray-500 mt-1">Encontre em: Mercado Pago &gt; Seu Negócio &gt; Configurações &gt; Chaves da API</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Access Token (Token de Acesso)</label>
                  <input type="password" placeholder="APP_USR-xxxxxxxxxxxxxxxxxxxxxxxx" value={mpForm.accessToken} onChange={(e) => setMpForm({ ...mpForm, accessToken: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" required />
                  <p className="text-xs text-gray-500 mt-1">Token de acesso com permissão para gerenciar pagamentos</p>
                </div>

                <div className="flex gap-2">
                  <button type="submit" disabled={mpConfigLoading} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
                    {mpConfigLoading ? "Salvando…" : "Salvar Configuração"}
                  </button>
                  <button type="button" onClick={() => setShowMpForm(false)} className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400">
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            <p className="text-xs text-gray-500">
              Modo Sandbox ativo para testes. Use as{" "}
              <a href="https://www.mercadopago.com.br/developers/pt/docs/sales-processing/integration/test-data" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                credenciais de teste
              </a>{" "}
              fornecidas pelo Mercado Pago.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Melhor Envio / Frete</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p className="text-base font-medium">{loading ? "Verificando…" : meStatus?.connected ? "Conectado" : "Desconectado"}</p>
              </div>
              <a href="/api/integrations/melhor-envio/authorize" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                {meStatus?.connected ? "Reautorizar" : "Conectar Melhor Envio"}
              </a>
            </div>
            {meStatus?.connected && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-gray-600">Ambiente</p>
                  <p className="font-medium">{meStatus.environment}</p>
                </div>
                <div>
                  <p className="text-gray-600">Expira em</p>
                  <p className="font-medium">{meStatus.expiresAt ? new Date(meStatus.expiresAt).toLocaleString() : "—"}</p>
                </div>
                <div className="sm:col-span-3">
                  <p className="text-gray-600">Escopos</p>
                  <p className="font-medium break-words">{meStatus.scope || "—"}</p>
                </div>
              </div>
            )}
            <p className="text-xs text-gray-500">Após conectar, o cálculo de frete, pontos de coleta e rastreamento usarão sua conta do Melhor Envio.</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Webhooks</h2>
          <p className="text-sm text-gray-600 mb-4">Envie um evento de teste para validar a URL configurada (N8N_ORDERS_WEBHOOK_URL ou N8N_WEBHOOK_URL).</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <button onClick={handleSendWebhookTest} disabled={webhookSending} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50">
              {webhookSending ? "Enviando…" : "Enviar webhook de teste"}
            </button>
            {webhookFeedback && <span className="text-sm text-gray-700">{webhookFeedback}</span>}
          </div>
          <p className="text-xs text-gray-500 mt-3">O payload contém um pedido fictício; personalize pelo corpo da requisição, se necessário.</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Realtime / Socket</h2>
          <p className="text-sm text-gray-600 mb-3">
            Verifica se o serviço Socket.IO público está disponível em <strong>{socketUrl || "—"}</strong>
          </p>
          <div className="flex items-center gap-4">
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <p className="text-base font-medium">
                {socketStatus === "checking" && "Verificando…"}
                {socketStatus === "connected" && "Conectado"}
                {socketStatus === "disconnected" && "Desconectado"}
                {socketStatus === "error" && "Erro ao conectar"}
              </p>
            </div>
            <button
              onClick={async () => {
                setSocketStatus("checking");
                try {
                  const mod = await import("socket.io-client");
                  const { io } = mod;
                  const sock = io(socketUrl, { transports: ["websocket"], reconnection: false, timeout: 3000 });
                  sock.once("connect", () => {
                    setSocketStatus("connected");
                    sock.close();
                  });
                  sock.once("connect_error", () => {
                    setSocketStatus("error");
                    try {
                      sock.close();
                    } catch {}
                  });
                  setTimeout(() => {
                    if (socketStatus === "checking") setSocketStatus("disconnected");
                    try {
                      sock.close();
                    } catch {}
                  }, 3500);
                } catch (e) {
                  setSocketStatus("error");
                }
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Verificar Agora
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Observação: esta checagem tenta abrir uma conexão WebSocket curta com o servidor Socket.IO público configurado em <code className="bg-gray-100 px-1 rounded">NEXT_PUBLIC_SOCKET_URL</code>.
          </p>
        </div>
      </div>
    </div>
  );
}
