/**
 * Template: Carrinho Abandonado
 *
 * Gatilho de recuperação de carrinho.
 * Enviado 24h após o abandono (configurável via query param `hours`).
 * Contém: itens deixados, valor total e CTA direto para o carrinho.
 */
import {
  Button,
  Column,
  Row,
  Section,
  Text,
  Hr,
  Img,
} from '@react-email/components';
import { EmailLayout } from './components/EmailLayout';

export interface AbandonedCartProps {
  userName: string;
  items: {
    name: string;
    quantity: number;
    price: number;
    imageUrl?: string;
  }[];
  total: number;
  cartUrl: string;
}

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Limita a exibição a 4 itens no e-mail para manter foco
const MAX_ITEMS_SHOWN = 4;

export function AbandonedCart({ userName, items, total, cartUrl }: AbandonedCartProps) {
  const firstName = userName.split(' ')[0];
  const shown = items.slice(0, MAX_ITEMS_SHOWN);
  const remaining = items.length - shown.length;

  return (
    <EmailLayout preview={`${firstName}, você deixou ${fmtBRL(total)} no carrinho 🛒`}>

      {/* Hero */}
      <Section style={hero}>
        <Text style={heroEmoji}>🛒</Text>
        <Text style={heroTitle}>Você esqueceu alguma coisa, {firstName}!</Text>
        <Text style={heroSub}>
          Seus itens estão reservados — mas não por muito tempo. Conclua sua compra agora.
        </Text>
      </Section>

      {/* Items */}
      <Section style={section}>
        <Text style={sectionTitle}>Itens no seu carrinho</Text>

        {shown.map((item, i) => (
          <Row key={i} style={itemRow}>
            {item.imageUrl && (
              <Column style={imgCol}>
                <Img
                  src={item.imageUrl}
                  alt={item.name}
                  width={64}
                  height={64}
                  style={itemImg}
                />
              </Column>
            )}
            <Column style={itemInfoCol}>
              <Text style={itemName}>{item.name}</Text>
              <Text style={itemMeta}>Qtd: {item.quantity}</Text>
            </Column>
            <Column style={itemPriceCol}>
              <Text style={itemPrice}>{fmtBRL(item.price * item.quantity)}</Text>
            </Column>
          </Row>
        ))}

        {remaining > 0 && (
          <Text style={moreItems}>
            + {remaining} {remaining === 1 ? 'outro item' : 'outros itens'} no carrinho
          </Text>
        )}
      </Section>

      <Hr style={divider} />

      {/* Total */}
      <Section style={totalSection}>
        <Row>
          <Column><Text style={totalLabel}>Total do carrinho</Text></Column>
          <Column style={rightCol}><Text style={totalValue}>{fmtBRL(total)}</Text></Column>
        </Row>
      </Section>

      {/* CTA principal */}
      <Section style={{ textAlign: 'center', padding: '8px 32px 32px' }}>
        <Button href={cartUrl} style={ctaButton}>
          Finalizar minha compra →
        </Button>
        <Text style={ctaHelp}>
          Clique no botão acima para retornar ao seu carrinho.
        </Text>
      </Section>

      <Hr style={divider} />

      {/* Urgência */}
      <Section style={urgencySection}>
        <Row>
          <Column style={urgencyCol}>
            <Text style={urgencyTitle}>🔒 Compra 100% Segura</Text>
            <Text style={urgencyText}>Pagamentos protegidos pelo Mercado Pago</Text>
          </Column>
          <Column style={urgencyCol}>
            <Text style={urgencyTitle}>🚚 Frete para todo o Brasil</Text>
            <Text style={urgencyText}>Entrega rápida via Melhor Envio</Text>
          </Column>
          <Column style={urgencyCol}>
            <Text style={urgencyTitle}>↩️ Troca garantida</Text>
            <Text style={urgencyText}>7 dias para solicitar devolução</Text>
          </Column>
        </Row>
      </Section>

    </EmailLayout>
  );
}

export default AbandonedCart;

// ── Styles ────────────────────────────────────────────────────────────────
const hero: React.CSSProperties = {
  backgroundColor: '#fffbeb',
  borderBottom: '1px solid #fde68a',
  padding: '32px 32px 24px',
  textAlign: 'center',
};
const heroEmoji: React.CSSProperties = { fontSize: '40px', margin: '0 0 12px', lineHeight: '1' };
const heroTitle: React.CSSProperties = { color: '#78350f', fontSize: '22px', fontWeight: '700', margin: '0 0 8px' };
const heroSub: React.CSSProperties = { color: '#92400e', fontSize: '15px', margin: 0 };

const section: React.CSSProperties = { padding: '24px 32px' };
const divider: React.CSSProperties = { borderColor: '#e5e7eb', margin: '0 32px' };
const sectionTitle: React.CSSProperties = {
  color: '#374151', fontSize: '12px', fontWeight: '600',
  letterSpacing: '0.05em', margin: '0 0 16px', textTransform: 'uppercase',
};

const itemRow: React.CSSProperties = { marginBottom: '12px', alignItems: 'center' };
const imgCol: React.CSSProperties = { width: '72px', paddingRight: '12px' };
const itemImg: React.CSSProperties = { borderRadius: '6px', objectFit: 'cover' };
const itemInfoCol: React.CSSProperties = {};
const itemPriceCol: React.CSSProperties = { width: '100px', textAlign: 'right' };
const itemName: React.CSSProperties = { color: '#111827', fontSize: '14px', fontWeight: '600', margin: '0 0 2px' };
const itemMeta: React.CSSProperties = { color: '#6b7280', fontSize: '12px', margin: 0 };
const itemPrice: React.CSSProperties = { color: '#0f172a', fontSize: '15px', fontWeight: '700', margin: 0, textAlign: 'right' };
const moreItems: React.CSSProperties = { color: '#6b7280', fontSize: '13px', margin: '4px 0 0' };

const totalSection: React.CSSProperties = { padding: '16px 32px' };
const rightCol: React.CSSProperties = { textAlign: 'right' };
const totalLabel: React.CSSProperties = { color: '#374151', fontSize: '16px', fontWeight: '600', margin: 0 };
const totalValue: React.CSSProperties = { color: '#0f172a', fontSize: '20px', fontWeight: '700', margin: 0 };

const ctaButton: React.CSSProperties = {
  backgroundColor: '#d97706',
  borderRadius: '6px',
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '16px',
  fontWeight: '700',
  padding: '14px 32px',
  textDecoration: 'none',
};
const ctaHelp: React.CSSProperties = { color: '#9ca3af', fontSize: '12px', margin: '12px 0 0' };

const urgencySection: React.CSSProperties = { padding: '20px 32px' };
const urgencyCol: React.CSSProperties = { padding: '0 8px', textAlign: 'center' };
const urgencyTitle: React.CSSProperties = { color: '#374151', fontSize: '13px', fontWeight: '600', margin: '0 0 4px' };
const urgencyText: React.CSSProperties = { color: '#6b7280', fontSize: '12px', margin: 0 };
