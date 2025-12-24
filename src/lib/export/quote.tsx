import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { pdf } from '@react-pdf/renderer';

export type QuotePdfPayload = {
  orderNumber: string;
  issuedAt: string;
  validityDays: number;
  customer: {
    name: string;
    email: string;
    phone?: string;
    taxId?: string;
    stateRegistration?: string;
  };
  items: Array<{ name: string; sku?: string; quantity: number; price: number; total: number }>;
  totals: { subtotal: number; shipping: number; total: number };
  store: {
    name: string;
    cnpj?: string;
    phone?: string;
    email?: string;
    address?: string;
    bankDetails?: string;
  };
  shipping?: {
    method: string;
    etaDays?: number;
    pickup?: boolean;
  };
  notes?: string;
};

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 11, color: '#0F172A' },
  h1: { fontSize: 20, marginBottom: 4, fontWeight: 700 },
  h2: { fontSize: 13, marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  card: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 10, marginBottom: 10 },
  table: { width: 'auto', borderStyle: 'solid', borderWidth: 1, borderRightWidth: 0, borderBottomWidth: 0, borderColor: '#E5E7EB' },
  tableRow: { flexDirection: 'row' },
  th: { backgroundColor: '#0F172A', color: '#F8FAFC', fontWeight: 700, textAlign: 'center' },
  tableCol: { borderStyle: 'solid', borderWidth: 1, borderLeftWidth: 0, borderTopWidth: 0, borderColor: '#E5E7EB', padding: 6, flexGrow: 1 },
  tableColRight: { borderStyle: 'solid', borderWidth: 1, borderLeftWidth: 0, borderTopWidth: 0, borderColor: '#E5E7EB', padding: 6, width: 90, textAlign: 'right' },
  small: { fontSize: 9, color: '#475569' },
});

const currency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function QuoteDocument({ data }: { data: QuotePdfPayload }) {
  const validityText = `Válido por ${data.validityDays} dia(s)`;
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>Orçamento #{data.orderNumber}</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
          <Text style={styles.small}>Emitido em {new Date(data.issuedAt).toLocaleString('pt-BR')}</Text>
          <Text style={[styles.small, { fontWeight: 700 }]}>{validityText}</Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 10 }}>
          <View style={[styles.card, { flex: 1 }]}> 
            <Text style={styles.h2}>Cliente</Text>
            <Text>{data.customer.name}</Text>
            <Text style={styles.small}>{data.customer.email}</Text>
            {data.customer.phone && <Text style={styles.small}>{data.customer.phone}</Text>}
            {data.customer.taxId && <Text style={styles.small}>Documento: {data.customer.taxId}</Text>}
            {data.customer.stateRegistration && <Text style={styles.small}>IE: {data.customer.stateRegistration}</Text>}
          </View>
          <View style={[styles.card, { flex: 1 }]}> 
            <Text style={styles.h2}>Loja</Text>
            <Text>{data.store.name}</Text>
            {data.store.cnpj && <Text style={styles.small}>CNPJ: {data.store.cnpj}</Text>}
            {data.store.address && <Text style={styles.small}>{data.store.address}</Text>}
            {data.store.phone && <Text style={styles.small}>{data.store.phone}</Text>}
            {data.store.email && <Text style={styles.small}>{data.store.email}</Text>}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.h2}>Itens</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.th]}>
              <Text style={styles.tableCol}>Produto</Text>
              <Text style={styles.tableCol}>Qtd</Text>
              <Text style={styles.tableColRight}>Unitário</Text>
              <Text style={styles.tableColRight}>Subtotal</Text>
            </View>
            {data.items.map((item, idx) => (
              <View key={idx} style={styles.tableRow}>
                <Text style={styles.tableCol}>{item.name}{item.sku ? ` • ${item.sku}` : ''}</Text>
                <Text style={styles.tableCol}>{item.quantity}</Text>
                <Text style={styles.tableColRight}>{currency(item.price)}</Text>
                <Text style={styles.tableColRight}>{currency(item.total)}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.card, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }]}> 
          <View style={{ flex: 1 }}>
            <Text style={styles.h2}>Pagamento / Banco</Text>
            <Text style={styles.small}>{data.store.bankDetails || 'Dados bancários não informados'}</Text>
            {data.shipping && (
              <View style={{ marginTop: 6 }}>
                <Text style={styles.h2}>Entrega</Text>
                <Text style={styles.small}>{data.shipping.method}</Text>
                {typeof data.shipping.etaDays === 'number' && (
                  <Text style={styles.small}>Prazo estimado: {data.shipping.etaDays} dia(s)</Text>
                )}
                {data.shipping.pickup && <Text style={styles.small}>Retirada sem custo</Text>}
              </View>
            )}
            {data.notes && (
              <View style={{ marginTop: 6 }}>
                <Text style={styles.h2}>Observações</Text>
                <Text style={styles.small}>{data.notes}</Text>
              </View>
            )}
          </View>
          <View style={{ width: 220 }}>
            <Text style={styles.h2}>Totais</Text>
            <View style={{ gap: 4 }}>
              <View style={styles.row}>
                <Text>Subtotal</Text>
                <Text>{currency(data.totals.subtotal)}</Text>
              </View>
              <View style={styles.row}>
                <Text>Frete</Text>
                <Text>{currency(data.totals.shipping)}</Text>
              </View>
              <View style={[styles.row, { fontWeight: 700 }]}> 
                <Text>Total</Text>
                <Text>{currency(data.totals.total)}</Text>
              </View>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export async function generateQuotePdf(data: QuotePdfPayload): Promise<Blob> {
  const instance = pdf(<QuoteDocument data={data} />);
  const blob = await instance.toBlob();
  return blob;
}
