'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body>
        <div className="min-h-screen bg-white flex items-center justify-center px-4 font-sans">
          <div className="max-w-md w-full text-center" style={{ fontFamily: 'system-ui, sans-serif' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <div style={{
                width: '5rem', height: '5rem', borderRadius: '50%',
                background: '#fef2f2', border: '2px solid rgba(204,16,32,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <AlertTriangle style={{ width: '2.5rem', height: '2.5rem', color: '#CC1020' }} />
              </div>
            </div>

            <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#111827', marginBottom: '0.5rem' }}>
              Algo deu errado
            </h1>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              Ocorreu um erro crítico. Nossa equipe foi notificada.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
              <button
                onClick={reset}
                style={{
                  background: '#CC1020', color: '#fff', border: 'none',
                  padding: '0.625rem 1.5rem', borderRadius: '0.375rem',
                  cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600
                }}
              >
                Tentar novamente
              </button>
              <a href="/" style={{ color: '#CC1020', fontSize: '0.875rem', textDecoration: 'underline' }}>
                Voltar ao início
              </a>
            </div>

            {error.digest && (
              <p style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#9ca3af' }}>
                Código de erro: {error.digest}
              </p>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
