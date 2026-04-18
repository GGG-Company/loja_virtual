/**
 * Template: Confirmação de Pedido
 *
 * Disparado após o pagamento ser aprovado (status CONFIRMED).
 * Contém: resumo dos itens, endereço de entrega, frete e total.
 */
import {
  Button,
  Column,
  Row,
  Section,
  Text,
  Hr,
} from '@react-email/components';
import { EmailLayout } from './components/EmailLayout';

export interface OrderConfirmationProps {
  orderNumber: string;
  userName: string;
  items: {
    name: string;
    quantity: number;
    price: number;
    imageUrl?: string;
  }[];
  subtotal: number;
  shippingCost: number;
  discount: number;
  total: number;
  shippingAddress: string;
  paymentMethod: string;
  estimatedDelivery?: string;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://feiradeferramentas.com.br';

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function OrderConfirmation({
  orderNumber,
  userName,
  items,
  subtotal,
  shippingCost,
  discount,
  total,
  shippingAddress,
  paymentMethod,
  estimatedDelivery,
}: OrderConfirmationProps) {
  return (
    <EmailLayout preview={`Pedido #${orderNumber} confirmado — obrigado, ${userName.split(' ')[0]}!`}>

      {/* Hero */}
      <Section style={hero}>
        <Text style={heroIcon}>✓</Text>
        <Text style={heroTitle}>Pedido Confirmado!</Text>
        <Text style={heroSub}>
          Olá, {userName.split(' ')[0]}! Recebemos seu pedido e já estamos preparando tudo para você.
        </Text>
      </Section>

      {/* Order number */}
      <Section style={section}>
        <Text style={labelText}>Número do Pedido</Text>
        <Text style={orderNumText}>#{orderNumber}</Text>
      </Section>

      <Hr style={divider} />

      {/* Items */}
      <Section style={section}>
        <Text style={sectionTitle}>Itens do Pedido</Text>
        {items.map((item, i) => (
          <Row key={i} style={itemRow}>
            <Column style={itemQtyCol}>
              <Text style={itemQty}>{item.quantity}×</Text>
            </Column>
            <Column style={itemNameCol}>
              <Text style={itemName}>{item.name}</Text>
            </Column>
            <Column style={itemPriceCol}>
              <Text style={itemPrice}>{fmtBRL(item.price * item.quantity)}</Text>
            </Column>
          </Row>
        ))}
      </Section>

      <Hr style={divider} />

      {/* Totals */}
      <Section style={section}>
        <Row style={totalRow}>
          <Column><Text style={totalLabel}>Subtotal</Text></Column>
          <Column style={rightCol}><Text style={totalValue}>{fmtBRL(subtotal)}</Text></Column>
        </Row>
        {discount > 0 && (
          <Row style={totalRow}>
            <Column><Text style={totalLabel}>Desconto</Text></Column>
            <Column style={rightCol}><Text style={{ ...totalValue, color: '#059669' }}>−{fmtBRL(discount)}</Text></Column>
          </Row>
        )}
        <Row style={totalRow}>
          <Column><Text style={totalLabel}>Frete</Text></Column>
          <Column style={rightCol}>
            <Text style={totalValue}>
              {shippingCost === 0 ? 'Grátis' : fmtBRL(shippingCost)}
            </Text>
          </Column>
        </Row>
        <Row style={{ ...totalRow, borderTop: '2px solid #e5e7eb', paddingTop: '12px', marginTop: '4px' }}>
          <Column><Text style={grandTotalLabel}>Total</Text></Column>
          <Column style={rightCol}><Text style={grandTotalValue}>{fmtBRL(total)}</Text></Column>
        </Row>
      </Section>

      <Hr style={divider} />

      {/* Shipping info */}
      <Section style={section}>
        <Row>
          <Column>
            <Text style={sectionTitle}>Endereço de Entrega</Text>
            <Text style={infoText}>{shippingAddress}</Text>
            {estimatedDelivery && (
              <Text style={infoText}>
                <strong>Prazo estimado:</strong> {estimatedDelivery}
              </Text>
            )}
          </Column>
          <Column>
            <Text style={sectionTitle}>Forma de Pagamento</Text>
            <Text style={infoText}>{paymentMethod}</Text>
          </Column>
        </Row>
      </Section>

      {/* CTA */}
      <Section style={{ ...section, textAlign: 'center', paddingBottom: '32px' }}>
        <Button href={`${APP_URL}/minha-conta`} style={ctaButton}>
          Acompanhar meu pedido →
        </Button>
      </Section>

    </EmailLayout>
  );
}

export default OrderConfirmation;

// ── Styles ────────────────────────────────────────────────────────────────
const hero: React.CSSProperties = {
  backgroundColor: '#f0fdf4',
  padding: '32px 32px 24px',
  textAlign: 'center',
  borderBottom: '1px solid #bbf7d0',
};
const heroIcon: React.CSSProperties = {
  backgroundColor: '#16a34a',
  borderRadius: '50%',
  color: '#fff',
  display: 'inline-block',
  fontSize: '24px',
  fontWeight: '700',
  height: '48px',
  lineHeight: '48px',
  margin: '0 0 16px',
  textAlign: 'center',
  width: '48px',
};
const heroTitle: React.CSSProperties = {
  color: '#14532d',
  fontSize: '24px',
  fontWeight: '700',
  margin: '0 0 8px',
};
const heroSub: React.CSSProperties = { color: '#166534', fontSize: '15px', margin: 0 };

const section: React.CSSProperties = { padding: '20px 32px' };
const divider: React.CSSProperties = { borderColor: '#e5e7eb', margin: '0 32px' };
const sectionTitle: React.CSSProperties = {
  color: '#374151', fontSize: '12px', fontWeight: '600',
  letterSpacing: '0.05em', margin: '0 0 12px', textTransform: 'uppercase',
};
const labelText: React.CSSProperties = { color: '#6b7280', fontSize: '12px', margin: '0 0 4px' };
const orderNumText: React.CSSProperties = {
  color: '#0f172a', fontSize: '20px', fontWeight: '700', margin: 0,
};

const itemRow: React.CSSProperties = { marginBottom: '8px' };
const itemQtyCol: React.CSSProperties = { width: '40px' };
const itemNameCol: React.CSSProperties = {};
const itemPriceCol: React.CSSProperties = { width: '100px', textAlign: 'right' };
const itemQty: React.CSSProperties = { color: '#6b7280', fontSize: '14px', margin: 0 };
const itemName: React.CSSProperties = { color: '#111827', fontSize: '14px', margin: 0 };
const itemPrice: React.CSSProperties = { color: '#111827', fontSize: '14px', fontWeight: '600', margin: 0, textAlign: 'right' };

const totalRow: React.CSSProperties = { marginBottom: '6px' };
const rightCol: React.CSSProperties = { textAlign: 'right' };
const totalLabel: React.CSSProperties = { color: '#6b7280', fontSize: '14px', margin: 0 };
const totalValue: React.CSSProperties = { color: '#374151', fontSize: '14px', margin: 0 };
const grandTotalLabel: React.CSSProperties = { color: '#111827', fontSize: '16px', fontWeight: '700', margin: 0 };
const grandTotalValue: React.CSSProperties = { color: '#0f172a', fontSize: '18px', fontWeight: '700', margin: 0 };

const infoText: React.CSSProperties = { color: '#374151', fontSize: '14px', margin: '0 0 4px' };

const ctaButton: React.CSSProperties = {
  backgroundColor: '#0f172a',
  borderRadius: '6px',
  color: '#f8fafc',
  display: 'inline-block',
  fontSize: '15px',
  fontWeight: '600',
  padding: '12px 28px',
  textDecoration: 'none',
};
