'use client';

import { useEffect, useState } from 'react';

type MelhorEnvioStatus = {
  connected: boolean;
  environment?: 'sandbox' | 'production';
  expiresAt?: string | null;
  scope?: string | null;
};

type MercadoPagoStatus = {
  connected: boolean;
  environment?: 'sandbox' | 'production';
  updatedAt?: string | null;
};

export default function AdminSettingsPage() {
  const [meStatus, setMeStatus] = useState<MelhorEnvioStatus | null>(null);
  const [mpStatus, setMpStatus] = useState<MercadoPagoStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [mpConfigLoading, setMpConfigLoading] = useState(false);
  const [showMpForm, setShowMpForm] = useState(false);
  const [mpForm, setMpForm] = useState({ publicKey: '', accessToken: '' });

  // Carregar status das integrações
  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        
        // Melhor Envio
        const meRes = await fetch('/api/admin/integrations/melhor-envio/status', { cache: 'no-store' });
        if (meRes.ok) {
          setMeStatus(await meRes.json());
        } else {
          setMeStatus({ connected: false });
        }

        // Mercado Pago
        const mpRes = await fetch('/api/admin/integrations/mercado-pago/status', { cache: 'no-store' });
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
      const res = await fetch('/api/admin/integrations/mercado-pago/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publicKey: mpForm.publicKey,
          accessToken: mpForm.accessToken,
          environment: 'sandbox',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMpStatus(data);
        setShowMpForm(false);
        setMpForm({ publicKey: '', accessToken: '' });
      } else {
        alert('Erro ao salvar configuração');
      }
    } catch (error) {
      alert('Erro ao salvar configuração');
      console.error(error);
    } finally {
      setMpConfigLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Configurações</h1>
      
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Informações da Loja</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome da Loja
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Shopping das Ferramentas"
                disabled
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email de Contato
              </label>
              <input
                type="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="contato@loja.com"
                disabled
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Mercado Pago / Pagamento</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p className="text-base font-medium">
                  {loading ? 'Verificando…' : mpStatus?.connected ? 'Conectado' : 'Desconectado'}
                </p>
              </div>
              <button
                onClick={() => setShowMpForm(!showMpForm)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {mpStatus?.connected ? 'Atualizar' : 'Configurar'} Mercado Pago
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
                  <p className="font-medium">{mpStatus.updatedAt ? new Date(mpStatus.updatedAt).toLocaleString() : '—'}</p>
                </div>
              </div>
            )}

            {showMpForm && (
              <form onSubmit={handleSaveMercadoPago} className="mt-4 p-4 bg-gray-50 rounded space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Public Key (Chave Pública)
                  </label>
                  <input
                    type="text"
                    placeholder="TEST-xxxxxxxxxxxxxxxxxxxxxxxx"
                    value={mpForm.publicKey}
                    onChange={(e) => setMpForm({ ...mpForm, publicKey: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Encontre em: Mercado Pago &gt; Seu Negócio &gt; Configurações &gt; Chaves da API
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Access Token (Token de Acesso)
                  </label>
                  <input
                    type="password"
                    placeholder="APP_USR-xxxxxxxxxxxxxxxxxxxxxxxx"
                    value={mpForm.accessToken}
                    onChange={(e) => setMpForm({ ...mpForm, accessToken: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Token de acesso com permissão para gerenciar pagamentos
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={mpConfigLoading}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    {mpConfigLoading ? 'Salvando…' : 'Salvar Configuração'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowMpForm(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            <p className="text-xs text-gray-500">
              Modo Sandbox ativo para testes. Use as <a href="https://www.mercadopago.com.br/developers/pt/docs/sales-processing/integration/test-data" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">credenciais de teste</a> fornecidas pelo Mercado Pago.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Melhor Envio / Frete</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p className="text-base font-medium">
                  {loading ? 'Verificando…' : meStatus?.connected ? 'Conectado' : 'Desconectado'}
                </p>
              </div>
              <a
                href="/api/integrations/melhor-envio/authorize"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {meStatus?.connected ? 'Reautorizar' : 'Conectar Melhor Envio'}
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
                  <p className="font-medium">{meStatus.expiresAt ? new Date(meStatus.expiresAt).toLocaleString() : '—'}</p>
                </div>
                <div className="sm:col-span-3">
                  <p className="text-gray-600">Escopos</p>
                  <p className="font-medium break-words">{meStatus.scope || '—'}</p>
                </div>
              </div>
            )}
            <p className="text-xs text-gray-500">
              Após conectar, o cálculo de frete, pontos de coleta e rastreamento usarão sua conta do Melhor Envio.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
