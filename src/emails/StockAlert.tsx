import { Button, Section, Text, Img } from '@react-email/components';
import { EmailLayout } from './components/EmailLayout';

export interface StockAlertProps {
  productName: string;
  productUrl: string;
  productImageUrl?: string;
  productPrice: string;
}

export function StockAlert({ productName, productUrl, productImageUrl, productPrice }: StockAlertProps) {
  return (
    <EmailLayout preview={`${productName} voltou ao estoque!`}>
      <Section style={{ textAlign: 'center', padding: '24px 0 16px' }}>
        <Text style={{ fontSize: 22, fontWeight: 700, color: '#111', margin: 0 }}>
          Produto disponível! 🎉
        </Text>
        <Text style={{ fontSize: 15, color: '#555', marginTop: 8 }}>
          O produto que você queria voltou ao estoque.
        </Text>
      </Section>

      {productImageUrl && (
        <Section style={{ textAlign: 'center', margin: '0 0 16px' }}>
          <Img src={productImageUrl} alt={productName} width={180} height={180} style={{ objectFit: 'contain', borderRadius: 8, border: '1px solid #eee' }} />
        </Section>
      )}

      <Section style={{ background: '#f9f9f9', borderRadius: 8, padding: '16px 24px', margin: '0 0 24px' }}>
        <Text style={{ fontSize: 16, fontWeight: 600, color: '#111', margin: '0 0 4px' }}>{productName}</Text>
        <Text style={{ fontSize: 18, fontWeight: 700, color: '#CC1020', margin: 0 }}>{productPrice}</Text>
      </Section>

      <Section style={{ textAlign: 'center' }}>
        <Button
          href={productUrl}
          style={{ background: '#CC1020', color: '#fff', borderRadius: 6, padding: '12px 32px', fontWeight: 600, fontSize: 15 }}
        >
          Comprar agora
        </Button>
      </Section>

      <Text style={{ fontSize: 12, color: '#999', textAlign: 'center', marginTop: 24 }}>
        Você recebeu este e-mail porque pediu para ser avisado quando este produto voltasse ao estoque.
      </Text>
    </EmailLayout>
  );
}
