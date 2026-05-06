/**
 * Funções de analytics — chamáveis de qualquer lugar (sem hooks React).
 * Verificam a existência de gtag/fbq antes de chamar, nunca lançam exceções.
 *
 * Configurar via .env:
 *   NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
 *   NEXT_PUBLIC_META_PIXEL_ID=XXXXXXXXXXXXXXXXX
 */

function gtag(...args: unknown[]) {
  if (typeof window === 'undefined') return;
  if (typeof (window as any).gtag !== 'function') return;
  (window as any).gtag(...args);
}

function fbq(event: string, name: string, params?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  if (typeof (window as any).fbq !== 'function') return;
  (window as any).fbq(event, name, params);
}

// ── Eventos de e-commerce ─────────────────────────────────────────────────────

export function trackViewProduct(item: { id: string; name: string; price: number; brand?: string; category?: string }) {
  try {
    gtag('event', 'view_item', {
      currency: 'BRL',
      value: item.price,
      items: [{ item_id: item.id, item_name: item.name, price: item.price, item_brand: item.brand, item_category: item.category }],
    });
    fbq('track', 'ViewContent', {
      content_ids: [item.id],
      content_name: item.name,
      content_type: 'product',
      value: item.price,
      currency: 'BRL',
    });
  } catch { /* silencioso */ }
}

export function trackAddToCart(item: { id: string; name: string; price: number; quantity: number; brand?: string }) {
  try {
    gtag('event', 'add_to_cart', {
      currency: 'BRL',
      value: item.price * item.quantity,
      items: [{ item_id: item.id, item_name: item.name, price: item.price, quantity: item.quantity, item_brand: item.brand }],
    });
    fbq('track', 'AddToCart', {
      content_ids: [item.id],
      content_name: item.name,
      content_type: 'product',
      value: item.price,
      currency: 'BRL',
    });
  } catch { /* silencioso */ }
}

export function trackBeginCheckout(params: { total: number; items: Array<{ id: string; name: string; price: number; quantity: number }> }) {
  try {
    gtag('event', 'begin_checkout', {
      currency: 'BRL',
      value: params.total,
      items: params.items.map(i => ({ item_id: i.id, item_name: i.name, price: i.price, quantity: i.quantity })),
    });
    fbq('track', 'InitiateCheckout', {
      value: params.total,
      currency: 'BRL',
      num_items: params.items.reduce((s, i) => s + i.quantity, 0),
    });
  } catch { /* silencioso */ }
}

export function trackPurchase(params: {
  orderId: string;
  total: number;
  shipping?: number;
  items: Array<{ id: string; name: string; price: number; quantity: number }>;
}) {
  try {
    gtag('event', 'purchase', {
      transaction_id: params.orderId,
      currency: 'BRL',
      value: params.total,
      shipping: params.shipping ?? 0,
      items: params.items.map(i => ({ item_id: i.id, item_name: i.name, price: i.price, quantity: i.quantity })),
    });
    fbq('track', 'Purchase', {
      value: params.total,
      currency: 'BRL',
      content_ids: params.items.map(i => i.id),
      content_type: 'product',
      num_items: params.items.reduce((s, i) => s + i.quantity, 0),
    });
  } catch { /* silencioso */ }
}

export function trackSearch(query: string) {
  try {
    gtag('event', 'search', { search_term: query });
    fbq('track', 'Search', { search_string: query });
  } catch { /* silencioso */ }
}

export function trackSignUp() {
  try {
    gtag('event', 'sign_up');
    fbq('track', 'CompleteRegistration');
  } catch { /* silencioso */ }
}

export function trackLogin() {
  try {
    gtag('event', 'login');
  } catch { /* silencioso */ }
}
