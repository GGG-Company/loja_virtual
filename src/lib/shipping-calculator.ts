import { prisma } from '@/lib/prisma';
import { getAccessToken, commonHeaders } from '@/lib/melhorenvio-oauth';

export type ShippingDimension = {
  height: number;
  width: number;
  length: number;
};

export type ShippingItem = {
  productId: string;
  name?: string;
  quantity: number;
  weightKg?: number | null;
  dimensions?: ShippingDimension | null;
  price?: number;
};

export type ShippingOption = {
  id: string;
  service: string;
  carrier: string;
  price: number;
  etaDays?: number;
  pickup?: boolean;
  notes?: string;
};

export type PickupPoint = {
  id: string;
  name: string;
  address: string;
  city?: string;
  state?: string;
  zip?: string;
  company?: string;
};

export type TrackingEvent = {
  status: string;
  description?: string;
  date?: string;
  origin?: string;
  destination?: string;
};

export type TrackingInfo = {
  code: string;
  lastStatus?: string;
  updatedAt?: string;
  raw?: any;
  events?: TrackingEvent[];
};

function melhorEnvioBaseUrl() {
  const isSandbox = (process.env.MELHOR_ENVIO_SANDBOX || 'true').toLowerCase() !== 'false';
  return isSandbox ? 'https://sandbox.melhorenvio.com.br' : 'https://melhorenvio.com.br';
}

function normalizeZip(zip: string) {
  return zip.replace(/\D/g, '');
}

function parseDimensions(dim: any): ShippingDimension | null {
  if (!dim || typeof dim !== 'object') return null;
  const height = Number((dim.height ?? dim.altura ?? dim.h) || 0);
  const width = Number((dim.width ?? dim.largura ?? dim.w) || 0);
  const length = Number((dim.depth ?? dim.length ?? dim.comprimento ?? dim.l) || 0);
  if (!height && !width && !length) return null;
  return {
    height: height || 10,
    width: width || 10,
    length: length || 10,
  };
}

function resolveVolumetricWeight(dim: ShippingDimension | null) {
  if (!dim) return 0;
  const cubicCm = dim.height * dim.width * dim.length;
  return cubicCm / 6000; // regra volumétrica padrão
}

function aggregatePackage(items: ShippingItem[]) {
  let totalWeightKg = 0;
  let totalPrice = 0;
  let length = 0;
  let width = 0;
  let height = 0;

  items.forEach((item) => {
    const qty = item.quantity || 1;
    const weight = Number(item.weightKg || 1);
    const dims = item.dimensions || { height: 12, width: 18, length: 24 };

    totalWeightKg += weight * qty;
    totalPrice += (item.price || 0) * qty;

    // Heurística: comprimento soma, largura/altura usam máximo
    length += (dims.length || 20) * qty;
    width = Math.max(width, dims.width || 20);
    height = Math.max(height, dims.height || 10);
  });

  return {
    totalWeightGrams: Math.max(1, Math.round(totalWeightKg * 1000)),
    length: Math.max(10, Math.round(length)),
    width: Math.max(10, Math.round(width)),
    height: Math.max(5, Math.round(height)),
    totalPrice,
  };
}

function roundPrice(v: number) {
  return Math.max(0, Math.round(v * 100) / 100);
}

async function quoteWithMelhorEnvio(params: { items: ShippingItem[]; destinationZip: string; originZip: string; }): Promise<ShippingOption[] | null> {
  const token = await getAccessToken();
  if (!token) return null;

  const servicesStr = (process.env.MELHOR_ENVIO_SERVICES || '1,2').trim(); // API exige string com ids separados por vírgula
  const baseUrl = melhorEnvioBaseUrl();

  const pkg = aggregatePackage(params.items);
  const body = {
    from: { postal_code: params.originZip },
    to: { postal_code: params.destinationZip },
    products: [{
      id: 'bundle',
      width: pkg.width,
      height: pkg.height,
      length: pkg.length,
      weight: pkg.totalWeightGrams / 1000,
      insurance_value: pkg.totalPrice,
      quantity: 1,
    }],
    services: servicesStr,
  };

  try {
    const res = await fetch(`${baseUrl}/api/v2/me/shipment/calculate`, {
      method: 'POST',
      headers: { ...commonHeaders(), Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.warn('[shipping] melhor envio quote error', res.status, body?.slice(0, 300));
      return null;
    }

    const data = await res.json();
    if (!Array.isArray(data)) return null;

    const mapped = data.map((d: any) => ({
      id: String(d.service_id || d.id || d.name),
      service: d.name || d.delivery_service || 'Frete',
      carrier: d.company?.name || 'Melhor Envio',
      price: roundPrice(Number(d.price || d.cost || 0)),
      etaDays: d.delivery_time?.days || d.custom_delivery_time || null,
      notes: d.observations || d.company?.alias || undefined,
    })).filter((o: ShippingOption) => o.price >= 0);

    console.info('[shipping] melhor envio quote ok', mapped.length, 'opcoes');
    return mapped;
  } catch (err) {
    console.warn('[shipping] melhor envio fallback', err);
    return null;
  }
}

async function listPickupPointsFromMelhorEnvio(zip: string): Promise<PickupPoint[] | null> {
  const token = await getAccessToken();
  if (!token) return null;

  const baseUrl = melhorEnvioBaseUrl();
  const url = new URL(`${baseUrl}/api/v2/me/pickup-points`);
  url.searchParams.set('postal_code', zip);

  try {
    const res = await fetch(url.toString(), {
      headers: { ...commonHeaders(), Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.warn('[shipping] pickup list error', res.status, body?.slice(0, 300));
      return null;
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const body = await res.text().catch(() => '');
      console.warn('[shipping] pickup list non-json', res.status, body?.slice(0, 300));
      return null;
    }

    const data = await res.json().catch(() => null);
    if (!Array.isArray(data)) return null;

    const mapped = data.map((p: any) => ({
      id: String(p.id || p.code || p.label),
      name: p.name || p.label || 'Ponto de coleta',
      address: p.address || [p.street, p.number, p.neighborhood].filter(Boolean).join(', '),
      city: p.city || p.city_name,
      state: p.state || p.state_abbr,
      zip: p.postal_code || p.zip,
      company: p.company?.name || p.partner || undefined,
    })).filter((p: PickupPoint) => !!p.id);

    console.info('[shipping] pickup list ok', mapped.length, 'pontos');
    return mapped;
  } catch (err) {
    console.warn('[shipping] melhor envio pickup list failed', err);
    return null;
  }
}

async function trackWithMelhorEnvio(codes: string[]): Promise<TrackingInfo[] | null> {
  const token = await getAccessToken();
  if (!token || !codes.length) return null;

  const baseUrl = melhorEnvioBaseUrl();

  try {
    const res = await fetch(`${baseUrl}/api/v2/me/tracking`, {
      method: 'POST',
      headers: { ...commonHeaders(), Authorization: `Bearer ${token}` },
      body: JSON.stringify({ codes }),
      cache: 'no-store',
    });

    if (!res.ok) {
      await res.text().catch(() => {});
      return null;
    }

    const data = await res.json();
    if (!Array.isArray(data)) return null;

    return data.map((t: any) => ({
      code: t.code || t.tracking || '',
      lastStatus: t.last_status?.status || t.status || t.state,
      updatedAt: t.last_status?.date || t.updated_at,
      raw: t,
      events: Array.isArray(t.events)
        ? t.events.map((ev: any) => ({
            status: ev.status || ev.state,
            description: ev.description || ev.message,
            date: ev.date || ev.created_at,
            origin: ev.origin,
            destination: ev.destination,
          }))
        : undefined,
    })).filter((t: TrackingInfo) => !!t.code);
  } catch (err) {
    console.warn('[shipping] melhor envio tracking failed', err);
    return null;
  }
}

export async function loadShippingItems(rawItems: ShippingItem[]) {
  const ids = rawItems.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, weight: true, dimensions: true, price: true },
  });

  const productMap = new Map(products.map((p) => [p.id, p]));
  return rawItems.map((item) => {
    const db = productMap.get(item.productId);
    const weight = item.weightKg ?? db?.weight ?? 1;
    const dimensions = item.dimensions ?? parseDimensions(db?.dimensions) ?? { height: 12, width: 18, length: 24 };
    return {
      ...item,
      name: item.name ?? db?.name ?? 'Produto',
      weightKg: weight,
      dimensions,
      price: item.price ?? db?.price ?? 0,
    } as ShippingItem;
  });
}

export async function getShippingOptions(params: { items: ShippingItem[]; destinationZip: string; originZip?: string; }) {
  const normalized = await loadShippingItems(params.items);
  const originZip = normalizeZip(params.originZip || process.env.SHIPPING_ORIGIN_ZIP || '44002264');

  const pickup: ShippingOption = {
    id: 'pickup-feira',
    service: 'Retirada na Loja (Feira de Santana)',
    carrier: 'Loja Física',
    price: 0,
    etaDays: 0,
    pickup: true,
    notes: 'Sem custo, confirmar disponibilidade no balcão',
  };

  const melhorEnvio = await quoteWithMelhorEnvio({ items: normalized, destinationZip: normalizeZip(params.destinationZip), originZip });
  if (melhorEnvio && melhorEnvio.length) {
    const merged = [...melhorEnvio, pickup];
    const unique = Array.from(new Map(merged.map((o) => [o.id, o])).values());
    return unique;
  }

  // Sem fallback mock: se a cotação falhar, exibe apenas retirada em loja.
  return [pickup];
}

export async function getPickupPoints(params: { destinationZip: string; }) {
  const destinationZip = normalizeZip(params.destinationZip);
  const list = await listPickupPointsFromMelhorEnvio(destinationZip);
  return list || [];
}

export async function trackShipments(params: { trackingCodes: string[]; }) {
  const codes = params.trackingCodes.map((c) => c?.trim()).filter(Boolean) as string[];
  const result = await trackWithMelhorEnvio(codes);
  return result || [];
}
