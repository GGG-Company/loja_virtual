import type { Metadata } from 'next';
import { Barlow, Barlow_Condensed } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';
import { Providers } from '@/components/providers';
import { ChatAssistantLoader } from '@/components/chat-assistant-loader';

const barlow = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-barlow",
  display: "swap",
});

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-barlow-condensed",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Feira das Ferramentas — Onde Você Encontra Tudo!",
  description: "Loja especializada em ferramentas profissionais desde 2004. Bosch, Makita, DeWalt e muito mais.",
  keywords: "ferramentas, feira das ferramentas, furadeira, parafusadeira, makita, bosch, dewalt, ferramentas profissionais",
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Feira das Ferramentas",
    title: "Feira das Ferramentas — Onde Você Encontra Tudo!",
    description: "Loja especializada em ferramentas profissionais desde 2004. Bosch, Makita, DeWalt e muito mais.",
    images: [{ url: "/logo_shopping_das_ferramentas.jpg", width: 800, height: 800, alt: "Feira das Ferramentas" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Feira das Ferramentas — Onde Você Encontra Tudo!",
    description: "Loja especializada em ferramentas profissionais desde 2004. Bosch, Makita, DeWalt e muito mais.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${barlow.variable} ${barlowCondensed.variable} font-body`}>
        <Providers>
          {children}
          <ChatAssistantLoader />
          <Toaster position="top-right" richColors />
        </Providers>
      </body>
    </html>
  );
}
