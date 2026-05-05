'use client';

/**
 * ConsentScripts — carrega GA4 e Meta Pixel respeitando o consentimento LGPD.
 *
 * GA4: usa Consent Mode v2. O script é carregado sempre, mas só coleta dados
 *   completos após analytics_storage = 'granted'. Sem consentimento, envia
 *   apenas pings anônimos para modelagem de conversões.
 *
 * Meta Pixel: NÃO tem consent mode equivalente. Só é carregado se o usuário
 *   aceitar cookies de marketing.
 *
 * Variáveis de ambiente necessárias (.env.local / VPS):
 *   NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
 *   NEXT_PUBLIC_META_PIXEL_ID=XXXXXXXXXXXXXXXXX
 */

import Script from 'next/script';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

type ConsentState = { essential: true; analytics: boolean; marketing: boolean };

const CONSENT_KEY     = 'lgpd_consent';
const CONSENT_VERSION = '1';

const GA_ID    = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

function readConsent(): ConsentState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.version !== CONSENT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function ConsentScripts() {
  const [consent, setConsent] = useState<ConsentState | null>(null);
  const pathname = usePathname();

  // Lê consentimento inicial e escuta mudanças futuras
  useEffect(() => {
    setConsent(readConsent());

    const handler = (e: Event) => setConsent((e as CustomEvent<ConsentState>).detail);
    window.addEventListener('consentUpdated', handler);
    return () => window.removeEventListener('consentUpdated', handler);
  }, []);

  // GA4: atualiza consent mode quando o usuário escolhe
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (typeof (window as any).gtag !== 'function') return;
    (window as any).gtag('consent', 'update', {
      analytics_storage:  consent?.analytics ? 'granted' : 'denied',
      ad_storage:         consent?.marketing ? 'granted' : 'denied',
      ad_user_data:       consent?.marketing ? 'granted' : 'denied',
      ad_personalization: consent?.marketing ? 'granted' : 'denied',
    });
  }, [consent?.analytics, consent?.marketing]);

  // GA4: registra pageview em cada mudança de rota (SPA)
  useEffect(() => {
    if (!GA_ID || typeof window === 'undefined') return;
    if (typeof (window as any).gtag !== 'function') return;
    (window as any).gtag('config', GA_ID, { page_path: pathname });
  }, [pathname]);

  // Meta Pixel: registra pageview em cada mudança de rota (SPA)
  useEffect(() => {
    if (!consent?.marketing || typeof window === 'undefined') return;
    if (typeof (window as any).fbq !== 'function') return;
    (window as any).fbq('track', 'PageView');
  }, [pathname, consent?.marketing]);

  if (!GA_ID && !PIXEL_ID) return null;

  return (
    <>
      {/* ── Google Consent Mode v2 — default "denied" antes do GA4 carregar ── */}
      {GA_ID && (
        <Script id="gtag-consent-default" strategy="beforeInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('consent', 'default', {
            analytics_storage: 'denied',
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
            wait_for_update: 2000
          });
          gtag('set', 'ads_data_redaction', true);
          gtag('set', 'url_passthrough', true);
        `}</Script>
      )}

      {/* ── GA4 — sempre carrega; consent mode controla o que é coletado ── */}
      {GA_ID && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="afterInteractive"
          />
          <Script id="gtag-init" strategy="afterInteractive">{`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}', { send_page_view: false });
          `}</Script>
        </>
      )}

      {/* ── Meta Pixel — só carrega com consentimento de marketing ── */}
      {PIXEL_ID && consent?.marketing && (
        <Script id="meta-pixel" strategy="afterInteractive">{`
          !function(f,b,e,v,n,t,s){
            if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)
          }(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
          fbq('init','${PIXEL_ID}');
          fbq('track','PageView');
        `}</Script>
      )}
    </>
  );
}
