'use client';

import { useEffect, useState } from 'react';

type MelhorEnvioStatus = {
  connected: boolean;
  environment?: 'sandbox' | 'production';
  expiresAt?: string | null;
  scope?: string | null;
};

export default function AdminSettingsPage() {
  const [meStatus, setMeStatus] = useState<MelhorEnvioStatus | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/admin/integrations/melhor-envio/status', { cache: 'no-store' });
        if (!res.ok) {
          setMeStatus({ connected: false });
          return;
        }
        const data = await res.json();
        setMeStatus(data);
      } catch {
        setMeStatus({ connected: false });
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

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
          <h2 className="text-xl font-semibold mb-4">Pagamento</h2>
          <p className="text-gray-600">
            Configurações de gateway de pagamento em desenvolvimento.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Frete</h2>
          <p className="text-gray-600">
            Configurações de cálculo de frete em desenvolvimento.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Melhor Envio</h2>
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
