// Utilitários para geração de código PIX de simulação e QR Code
// Atenção: isto é para ambiente local de testes, não é um payload oficial.

export function buildPixCode(amountCents: number, city = 'Feira BA') {
  const cents = Math.max(0, Math.round(amountCents));
  // Base fictícia seguindo padrão geral do BRCode, não válido para produção
  return (
    '00020126360014BR.GOV.BCB.PIX0114+5511999999995204000053039865405' +
    String(cents).padStart(6, '0') +
    '5802BR5909LOJA TEST6009' + city + '62070503***6304ABCD'
  );
}

export async function generateQrDataUrl(code: string, width = 256) {
  const QRCode = await import('qrcode');
  return QRCode.toDataURL(code, { width, margin: 1 });
}
