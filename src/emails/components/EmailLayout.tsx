import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface EmailLayoutProps {
  preview: string;
  children: React.ReactNode;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://feiradeferramentas.com.br';

export function EmailLayout({ preview, children }: EmailLayoutProps) {
  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={body}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Text style={brandName}>Feira das Ferramentas</Text>
          </Section>

          {/* Content */}
          {children}

          {/* Footer */}
          <Hr style={divider} />
          <Section style={footer}>
            <Text style={footerText}>
              Feira das Ferramentas — sua loja de ferramentas profissionais
            </Text>
            <Text style={footerLinks}>
              <a href={`${APP_URL}/privacidade`} style={footerLink}>Privacidade</a>
              {' · '}
              <a href={`${APP_URL}/termos`} style={footerLink}>Termos de Uso</a>
              {' · '}
              <a href={`${APP_URL}/contato`} style={footerLink}>Contato</a>
            </Text>
            <Text style={footerMuted}>
              © {new Date().getFullYear()} Feira das Ferramentas. Todos os direitos reservados.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────
const body: React.CSSProperties = {
  backgroundColor: '#f3f4f6',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  margin: 0,
  padding: '32px 0',
};

const container: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  maxWidth: '600px',
  margin: '0 auto',
  overflow: 'hidden',
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
};

const header: React.CSSProperties = {
  backgroundColor: '#0f172a',
  padding: '24px 32px',
  textAlign: 'center',
};

const brandName: React.CSSProperties = {
  color: '#f8fafc',
  fontSize: '22px',
  fontWeight: '700',
  margin: 0,
  letterSpacing: '-0.3px',
};

const divider: React.CSSProperties = {
  borderColor: '#e5e7eb',
  margin: '0 32px',
};

const footer: React.CSSProperties = {
  padding: '24px 32px',
  textAlign: 'center',
};

const footerText: React.CSSProperties = {
  color: '#374151',
  fontSize: '13px',
  margin: '0 0 8px',
};

const footerLinks: React.CSSProperties = {
  color: '#6b7280',
  fontSize: '12px',
  margin: '0 0 8px',
};

const footerLink: React.CSSProperties = {
  color: '#6b7280',
  textDecoration: 'underline',
};

const footerMuted: React.CSSProperties = {
  color: '#9ca3af',
  fontSize: '11px',
  margin: 0,
};
