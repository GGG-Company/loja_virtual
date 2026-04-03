'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, X, Check, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ConsentState = {
  essential: true;       // sempre true — não pode ser desativado
  analytics: boolean;
  marketing: boolean;
};

const CONSENT_KEY = 'lgpd_consent';
const CONSENT_VERSION = '1'; // incrementar ao mudar categorias

function readConsent(): (ConsentState & { version: string }) | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.version !== CONSENT_VERSION) return null; // versão mudou → pedir novamente
    return parsed;
  } catch {
    return null;
  }
}

function saveConsent(consent: ConsentState) {
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ ...consent, version: CONSENT_VERSION }));
    // Disparar evento para que outros componentes possam reagir
    window.dispatchEvent(new CustomEvent('consentUpdated', { detail: consent }));
  } catch {
    // storage indisponível
  }
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [consent, setConsent] = useState<ConsentState>({
    essential: true,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    const stored = readConsent();
    if (!stored) {
      // Pequeno delay para não "piscar" na primeira renderização SSR
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const acceptAll = () => {
    const full: ConsentState = { essential: true, analytics: true, marketing: true };
    saveConsent(full);
    setVisible(false);
  };

  const acceptEssentialOnly = () => {
    const minimal: ConsentState = { essential: true, analytics: false, marketing: false };
    saveConsent(minimal);
    setVisible(false);
  };

  const saveCustom = () => {
    saveConsent(consent);
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 28 }}
          className="fixed bottom-0 left-0 right-0 z-[9999] p-4 md:p-6"
        >
          <div className="max-w-4xl mx-auto bg-[#1A1A1A] border border-[#CC1020]/30 shadow-2xl text-white">
            {/* barra vermelha topo */}
            <div className="h-1 bg-[#CC1020]" />

            <div className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="flex-shrink-0 w-10 h-10 bg-[#CC1020]/20 flex items-center justify-center">
                  <Cookie className="w-5 h-5 text-[#CC1020]" />
                </div>
                <div className="flex-1">
                  <h2 className="font-display font-bold text-lg uppercase mb-1">
                    Sua privacidade importa
                  </h2>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    Usamos cookies essenciais para o funcionamento da loja. Com seu consentimento,
                    também utilizamos cookies de análise e marketing para melhorar sua experiência.
                    Consulte nossa{' '}
                    <Link href="/privacidade" className="text-[#CC1020] underline hover:text-red-400">
                      Política de Privacidade
                    </Link>{' '}
                    e nossos{' '}
                    <Link href="/termos" className="text-[#CC1020] underline hover:text-red-400">
                      Termos de Serviço
                    </Link>.
                  </p>
                </div>
                <button
                  onClick={acceptEssentialOnly}
                  className="flex-shrink-0 text-gray-500 hover:text-white transition"
                  aria-label="Fechar e aceitar apenas essenciais"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Painel de detalhes */}
              <AnimatePresence>
                {showDetails && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden mb-4"
                  >
                    <div className="space-y-3 border border-white/10 p-4 bg-white/5">
                      {/* Essenciais */}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-sm">Cookies Essenciais</p>
                          <p className="text-xs text-gray-400">Sessão de login, carrinho, segurança. Sempre ativos.</p>
                        </div>
                        <div className="w-10 h-6 bg-[#CC1020] rounded-full flex items-center justify-end pr-1 cursor-not-allowed opacity-70">
                          <div className="w-4 h-4 bg-white rounded-full" />
                        </div>
                      </div>

                      {/* Analytics */}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-sm">Cookies de Análise</p>
                          <p className="text-xs text-gray-400">Métricas de visitas e desempenho de páginas.</p>
                        </div>
                        <button
                          onClick={() => setConsent((c) => ({ ...c, analytics: !c.analytics }))}
                          className={`w-10 h-6 rounded-full flex items-center transition-colors ${
                            consent.analytics ? 'bg-[#CC1020] justify-end pr-1' : 'bg-gray-600 justify-start pl-1'
                          }`}
                          aria-label="Alternar cookies de análise"
                        >
                          <div className="w-4 h-4 bg-white rounded-full" />
                        </button>
                      </div>

                      {/* Marketing */}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-sm">Cookies de Marketing</p>
                          <p className="text-xs text-gray-400">Personalização de ofertas e comunicações.</p>
                        </div>
                        <button
                          onClick={() => setConsent((c) => ({ ...c, marketing: !c.marketing }))}
                          className={`w-10 h-6 rounded-full flex items-center transition-colors ${
                            consent.marketing ? 'bg-[#CC1020] justify-end pr-1' : 'bg-gray-600 justify-start pl-1'
                          }`}
                          aria-label="Alternar cookies de marketing"
                        >
                          <div className="w-4 h-4 bg-white rounded-full" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Botões */}
              <div className="flex flex-wrap gap-3 items-center">
                <Button
                  onClick={acceptAll}
                  className="bg-[#CC1020] hover:bg-[#a50d1a] text-white font-display font-bold uppercase text-sm gap-2"
                >
                  <Check className="w-4 h-4" />
                  Aceitar Todos
                </Button>

                <Button
                  onClick={acceptEssentialOnly}
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10 font-display uppercase text-sm"
                >
                  Apenas Essenciais
                </Button>

                <button
                  onClick={() => setShowDetails((v) => !v)}
                  className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition ml-auto"
                >
                  <Settings2 className="w-4 h-4" />
                  {showDetails ? 'Ocultar preferências' : 'Personalizar'}
                </button>

                {showDetails && (
                  <Button
                    onClick={saveCustom}
                    size="sm"
                    className="bg-white/10 hover:bg-white/20 text-white text-sm"
                  >
                    Salvar preferências
                  </Button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Hook para ler o consentimento atual em outros componentes */
export function useCookieConsent(): ConsentState | null {
  const [consent, setConsent] = useState<ConsentState | null>(null);

  useEffect(() => {
    const stored = readConsent();
    if (stored) {
      const { version: _v, ...rest } = stored;
      setConsent(rest as ConsentState);
    }

    const handler = (e: Event) => {
      setConsent((e as CustomEvent<ConsentState>).detail);
    };
    window.addEventListener('consentUpdated', handler);
    return () => window.removeEventListener('consentUpdated', handler);
  }, []);

  return consent;
}
