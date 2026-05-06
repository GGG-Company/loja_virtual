'use client';

import logger from "@/lib/logger";
import { useEffect, useState } from 'react';
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

type EventStatus = 'idle' | 'sending' | 'ok' | 'error';
type EventResult = { event: string; label: string; ok: boolean; error?: string };

const ALL_EVENTS = [
  'order.PENDING', 'order.QUOTE', 'order.CONFIRMED', 'order.PROCESSING',
  'order.SHIPPED', 'order.DELIVERED', 'order.CANCELLED', 'order.REFUNDED',
  'returns.created', 'returns.approved', 'returns.rejected', 'shipping.label_ready',
] as const;

const EVENT_LABELS: Record<string, string> = {
  'order.PENDING':        'PENDING — pedido criado',
  'order.QUOTE':          'QUOTE — orçamento',
  'order.CONFIRMED':      'CONFIRMED — pagamento confirmado',
  'order.PROCESSING':     'PROCESSING — em separação',
  'order.SHIPPED':        'SHIPPED — enviado',
  'order.DELIVERED':      'DELIVERED — entregue',
  'order.CANCELLED':      'CANCELLED — cancelado',
  'order.REFUNDED':       'REFUNDED — reembolsado',
  'returns.created':      'returns.created — devolução aberta',
  'returns.approved':     'returns.approved — devolução aprovada',
  'returns.rejected':     'returns.rejected — devolução rejeitada',
  'shipping.label_ready': 'shipping.label_ready — etiqueta enviada',
};

export default function AdminSettingsPage() {
  const [meStatus, setMeStatus] = useState<MelhorEnvioStatus | null>(null);
  const [mpStatus, setMpStatus] = useState<MercadoPagoStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [mpConfigLoading, setMpConfigLoading] = useState(false);
  const [showMpForm, setShowMpForm] = useState(false);
  const [mpForm, setMpForm] = useState({ publicKey: "", accessToken: "" });
  const [eventStatuses, setEventStatuses] = useState<Record<string, EventStatus>>({});
  const [testAllSending, setTestAllSending] = useState(false);
  const [testAllSummary, setTestAllSummary] = useState<string | null>(null);

  type HiperConfig = {
    webhookEnabled: boolean;
    cronEnabled: boolean;
    cronIntervalMin: number;
    lastSyncAt: string | null;
    lastSyncStock: number;
    lastSyncErrors: number;
  };
  const [hiperConfig, setHiperConfig] = useState<HiperConfig>({
    webhookEnabled: true,
    cronEnabled: false,
    cronIntervalMin: 30,
    lastSyncAt: null,
    lastSyncStock: 0,
    lastSyncErrors: 0,
  });
  const [hiperLoading, setHiperLoading] = useState(false);
  const [hiperSaved, setHiperSaved] = useState(false);
  const [hiperSyncing, setHiperSyncing] = useState(false);
  const [hiperSyncResult, setHiperSyncResult] = useState<string | null>(null);

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

      } catch {
        setMeStatus({ connected: false });
        setMpStatus({ connected: false });
      } finally {
        setLoading(false);
      }
    };
    run();
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
          environment: mpForm.publicKey.startsWith('TEST-') ? 'sandbox' : 'production',
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

  const fireEvent = async (event: string) => {
    setEventStatuses((s) => ({ ...s, [event]: 'sending' }));
    try {
      const res = await fetch('/api/admin/integrations/webhook/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event }),
      });
      const data = await res.json().catch(() => null);
      const ok = res.ok && data?.results?.[0]?.ok !== false;
      setEventStatuses((s) => ({ ...s, [event]: ok ? 'ok' : 'error' }));
    } catch (err) {
      logger.error(err);
      setEventStatuses((s) => ({ ...s, [event]: 'error' }));
    }
  };

  const handleTestAll = async () => {
    setTestAllSending(true);
    setTestAllSummary(null);
    setEventStatuses({});
    try {
      const res = await fetch('/api/admin/integrations/webhook/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data: { results?: EventResult[]; error?: string } = await res.json().catch(() => ({}));
      if (!res.ok || data.error) {
        setTestAllSummary(data.error || 'Erro ao enviar webhooks');
        return;
      }
      const next: Record<string, EventStatus> = {};
      (data.results ?? []).forEach((r) => { next[r.event] = r.ok ? 'ok' : 'error'; });
      setEventStatuses(next);
      const ok = (data.results ?? []).filter((r) => r.ok).length;
      const fail = (data.results ?? []).length - ok;
      setTestAllSummary(fail === 0 ? `✓ ${ok} eventos enviados com sucesso.` : `${ok} ok · ${fail} com erro`);
    } catch (err) {
      logger.error(err);
      setTestAllSummary('Erro de rede');
    } finally {
      setTestAllSending(false);
    }
  };

  // Carregar config Hiper
  useEffect(() => {
    fetch('/api/admin/integrations/hiper/sync-config')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setHiperConfig(d); })
      .catch(() => {});
  }, []);

  const handleSaveHiper = async () => {
    setHiperLoading(true);
    setHiperSaved(false);
    try {
      const res = await fetch('/api/admin/integrations/hiper/sync-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookEnabled: hiperConfig.webhookEnabled,
          cronEnabled: hiperConfig.cronEnabled,
          cronIntervalMin: Number(hiperConfig.cronIntervalMin),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setHiperConfig(data);
        setHiperSaved(true);
        setTimeout(() => setHiperSaved(false), 3000);
      } else {
        alert('Erro ao salvar configuração Hiper');
      }
    } catch { alert('Erro ao salvar configuração Hiper'); }
    finally { setHiperLoading(false); }
  };

  const handleHiperManualSync = async () => {
    setHiperSyncing(true);
    setHiperSyncResult(null);
    try {
      const res = await fetch('/api/cron/hiper-sync', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (data.skipped) {
        setHiperSyncResult(`Ignorado: ${data.reason}`);
      } else if (data.ok) {
        setHiperSyncResult(`Concluído — ${data.stockUpdated} produtos atualizados${data.errors ? `, ${data.errors} erros` : ''}`);
        // Recarregar config para atualizar lastSyncAt
        fetch('/api/admin/integrations/hiper/sync-config')
          .then((r) => r.ok ? r.json() : null)
          .then((d) => { if (d) setHiperConfig(d); })
          .catch(() => {});
      } else {
        setHiperSyncResult(`Erro: ${data.error || 'falha desconhecida'}`);
      }
    } catch { setHiperSyncResult('Erro de rede'); }
    finally { setHiperSyncing(false); }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Configurações</h1>

      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Informações da Loja</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Loja</label>
              <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Feira das Ferramentas" disabled />
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
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xl font-semibold">Webhooks</h2>
            <button
              onClick={handleTestAll}
              disabled={testAllSending}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium"
            >
              {testAllSending ? 'Enviando todos…' : 'Testar todos'}
            </button>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Dispare cada evento real que o sistema envia para a URL configurada
            (<code className="bg-gray-100 px-1 rounded text-xs">N8N_ORDERS_WEBHOOK_URL</code>).
            Payloads fictícios, prontos para validar seu fluxo no n8n.
          </p>

          {testAllSummary && (
            <p className={`text-sm mb-3 font-medium ${testAllSummary.startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}>
              {testAllSummary}
            </p>
          )}

          {/* order.status.update */}
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">order.status.update</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5">
            {ALL_EVENTS.filter((e) => e.startsWith('order.')).map((event) => {
              const s = eventStatuses[event] ?? 'idle';
              return (
                <div key={event} className="flex items-center justify-between border border-gray-200 rounded px-3 py-2">
                  <span className="text-sm text-gray-700">{EVENT_LABELS[event]}</span>
                  <div className="flex items-center gap-2 ml-3 shrink-0">
                    {s === 'ok' && <span className="text-green-500 text-lg">✓</span>}
                    {s === 'error' && <span className="text-red-500 text-lg">✗</span>}
                    <button
                      onClick={() => fireEvent(event)}
                      disabled={s === 'sending'}
                      className="px-2 py-1 text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 rounded hover:bg-indigo-100 disabled:opacity-50"
                    >
                      {s === 'sending' ? '…' : 'Testar'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Eventos customizados */}
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Eventos customizados</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ALL_EVENTS.filter((e) => !e.startsWith('order.')).map((event) => {
              const s = eventStatuses[event] ?? 'idle';
              return (
                <div key={event} className="flex items-center justify-between border border-gray-200 rounded px-3 py-2">
                  <span className="text-sm text-gray-700">{EVENT_LABELS[event]}</span>
                  <div className="flex items-center gap-2 ml-3 shrink-0">
                    {s === 'ok' && <span className="text-green-500 text-lg">✓</span>}
                    {s === 'error' && <span className="text-red-500 text-lg">✗</span>}
                    <button
                      onClick={() => fireEvent(event)}
                      disabled={s === 'sending'}
                      className="px-2 py-1 text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 rounded hover:bg-indigo-100 disabled:opacity-50"
                    >
                      {s === 'sending' ? '…' : 'Testar'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Hiper — Sincronização de Estoque */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-1">Hiper — Sincronização de Estoque</h2>
          <p className="text-sm text-gray-500 mb-5">Configure o webhook (Hiper notifica em tempo real) e/ou o sync automático periódico.</p>

          <div className="space-y-5">
            {/* Webhook */}
            <div className="flex items-center justify-between border border-gray-200 rounded-lg px-4 py-3">
              <div>
                <p className="font-medium text-sm">Webhook em tempo real</p>
                <p className="text-xs text-gray-500 mt-0.5">Hiper envia uma notificação a cada venda na loja física</p>
              </div>
              <button
                type="button"
                onClick={() => setHiperConfig((c) => ({ ...c, webhookEnabled: !c.webhookEnabled }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${hiperConfig.webhookEnabled ? 'bg-green-500' : 'bg-gray-300'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${hiperConfig.webhookEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            {/* Cron */}
            <div className="flex items-center justify-between border border-gray-200 rounded-lg px-4 py-3">
              <div>
                <p className="font-medium text-sm">Sync automático (cron)</p>
                <p className="text-xs text-gray-500 mt-0.5">Consulta o Hiper periodicamente e atualiza estoques</p>
              </div>
              <button
                type="button"
                onClick={() => setHiperConfig((c) => ({ ...c, cronEnabled: !c.cronEnabled }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${hiperConfig.cronEnabled ? 'bg-green-500' : 'bg-gray-300'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${hiperConfig.cronEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            {/* Intervalo */}
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Intervalo do cron (minutos)</label>
              <input
                type="number"
                min={5}
                max={1440}
                value={hiperConfig.cronIntervalMin}
                onChange={(e) => setHiperConfig((c) => ({ ...c, cronIntervalMin: Number(e.target.value) }))}
                className="w-24 px-3 py-1.5 border border-gray-300 rounded-md text-sm"
              />
            </div>

            {/* Último sync */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm bg-gray-50 rounded-lg p-3">
              <div>
                <p className="text-gray-500">Último sync</p>
                <p className="font-medium">{hiperConfig.lastSyncAt ? new Date(hiperConfig.lastSyncAt).toLocaleString('pt-BR') : '—'}</p>
              </div>
              <div>
                <p className="text-gray-500">Produtos atualizados</p>
                <p className="font-medium">{hiperConfig.lastSyncStock}</p>
              </div>
              <div>
                <p className="text-gray-500">Erros</p>
                <p className={`font-medium ${hiperConfig.lastSyncErrors > 0 ? 'text-red-600' : ''}`}>{hiperConfig.lastSyncErrors}</p>
              </div>
            </div>

            {hiperSyncResult && (
              <p className={`text-sm font-medium ${hiperSyncResult.startsWith('Concluído') ? 'text-green-600' : 'text-red-600'}`}>
                {hiperSyncResult}
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={handleSaveHiper}
                disabled={hiperLoading}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 text-sm"
              >
                {hiperLoading ? 'Salvando…' : hiperSaved ? 'Salvo!' : 'Salvar configuração'}
              </button>
              <button
                type="button"
                onClick={handleHiperManualSync}
                disabled={hiperSyncing}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 disabled:opacity-50 text-sm"
              >
                {hiperSyncing ? 'Sincronizando…' : 'Sincronizar agora'}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
