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
  user?: { id?: string; name?: string; email?: string; phone?: string | null } | null;
  shippingAddress?: any;
  trackingCode?: string | null;
  trackingUrl?: string | null;
  paymentMethod?: string | null;
  paidAt?: string | Date | null;
  shippedAt?: string | Date | null;
  deliveredAt?: string | Date | null;
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
