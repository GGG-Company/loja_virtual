/**
 * Mailer — abstração sobre Resend.
 *
 * Usa a variável de ambiente RESEND_API_KEY.
 * Se não configurada, loga um aviso e não envia (seguro em dev/CI).
 *
 * Docs: https://resend.com/docs/send-with-nextjs
 */
import { render } from '@react-email/render';
import { Resend } from 'resend';
import logger from '@/lib/logger';
import type { OrderConfirmationProps } from '@/emails/OrderConfirmation';
import type { AbandonedCartProps } from '@/emails/AbandonedCart';
import type { StockAlertProps } from '@/emails/StockAlert';

// Lazy-init — evita erro se RESEND_API_KEY não estiver definida em dev
let _resend: Resend | null = null;
function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    logger.warn('[MAILER] RESEND_API_KEY não configurada — e-mails não serão enviados');
    return null;
  }
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

const FROM_ADDRESS = process.env.EMAIL_FROM ?? 'Feira das Ferramentas <noreply@feiradeferramentas.com.br>';

// ── Helpers ───────────────────────────────────────────────────────────────
async function send(to: string, subject: string, reactComponent: React.ReactElement) {
  const resend = getResend();
  if (!resend) return { ok: false, reason: 'RESEND_API_KEY not set' };

  try {
    const html = await render(reactComponent);
    const { error } = await resend.emails.send({ from: FROM_ADDRESS, to, subject, html });
    if (error) {
      logger.error({ to, subject, error }, '[MAILER] Erro ao enviar e-mail');
      return { ok: false, reason: error.message };
    }
    logger.info({ to, subject }, '[MAILER] E-mail enviado');
    return { ok: true };
  } catch (err) {
    logger.error(err as Error, '[MAILER] Erro inesperado ao enviar e-mail');
    return { ok: false, reason: String(err) };
  }
}

// ── Public API ─────────────────────────────────────────────────────────────
export async function sendOrderConfirmationEmail(
  to: string,
  props: OrderConfirmationProps,
) {
  const { OrderConfirmation } = await import('@/emails/OrderConfirmation');
  return send(
    to,
    `Pedido #${props.orderNumber} confirmado ✓`,
        OrderConfirmation(props) as React.ReactElement,
  );
}

export async function sendAbandonedCartEmail(
  to: string,
  props: AbandonedCartProps,
) {
  const { AbandonedCart } = await import('@/emails/AbandonedCart');
  return send(
    to,
    'Você deixou itens no carrinho 🛒',
    AbandonedCart(props) as React.ReactElement,
  );
}

export async function sendStockAlertEmail(to: string, props: StockAlertProps) {
  const { StockAlert } = await import('@/emails/StockAlert');
  return send(to, `${props.productName} voltou ao estoque!`, StockAlert(props) as React.ReactElement);
}
