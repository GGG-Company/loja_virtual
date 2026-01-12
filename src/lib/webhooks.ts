import path from 'path';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: path.join(process.cwd(), '.env') });

loadEnv();

type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED"
  | "QUOTE";

export async function sendOrderStatusUpdate(payload: {
  orderId?: string | number;
  orderNumber?: string;
  status: OrderStatus;
  total?: number;
  user?: { id?: string; name?: string | null; email?: string; phone?: string | null } | null;
  shippingAddress?: any;
  trackingCode?: string | null;
  trackingUrl?: string | null;
  paymentMethod?: string | null;
  paidAt?: string | Date | null;
  shippedAt?: string | Date | null;
  deliveredAt?: string | Date | null;
  items?: Array<{
    id?: string;
    productId?: string;
    quantity?: number;
    price?: number;
    discount?: number;
    subtotal?: number;
    product?: {
      id?: string;
      name?: string;
      sku?: string;
      imageUrl?: string | null;
    };
  }>;
  extra?: Record<string, unknown>;
}) {
  const url = process.env.N8N_ORDERS_WEBHOOK_URL || process.env.N8N_WEBHOOK_URL;
  if (!url) return; // No webhook configured; quietly skip

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "order.status.update",
        timestamp: new Date().toISOString(),
        ...payload,
      }),
    });
    // Best-effort: ignore non-2xx errors to avoid breaking user flows
    if (!res.ok) {
      // Consume body to free resources
      await res.text().catch(() => {});
    }
  } catch {
    // Silently ignore network/config errors
  }
}

// Generic webhook sender function
export async function sendWebhook(event: string, payload: Record<string, unknown>) {
  const url = process.env.N8N_ORDERS_WEBHOOK_URL || process.env.N8N_WEBHOOK_URL;
  if (!url) return;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: event,
        timestamp: new Date().toISOString(),
        ...payload,
      }),
    });
    if (!res.ok) {
      await res.text().catch(() => {});
    }
  } catch {
    // Silently ignore network/config errors
  }
}
