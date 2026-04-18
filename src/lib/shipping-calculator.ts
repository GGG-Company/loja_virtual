import { prisma } from '@/lib/prisma';
import logger from "@/lib/logger";
import { getAccessToken, commonHeaders } from '@/lib/melhorenvio-oauth';
import { withCircuitBreaker } from '@/lib/circuit-breaker';

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

/** @internal Exportada para testes unitários */
export function parseDimensions(dim: any): ShippingDimension | null {
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

/** @internal Exportada para testes unitários */
export function resolveVolumetricWeight(dim: ShippingDimension | null) {
  if (!dim) return 0;
  const cubicCm = dim.height * dim.width * dim.length;
  return cubicCm / 6000; // regra volumétrica padrão
}

/** @internal Exportada para testes unitários */
export function aggregatePackage(items: ShippingItem[]) {
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

/** @internal Exportada para testes unitários */
export function roundPrice(v: number) {
  return Math.max(0, Math.round(v * 100) / 100);
}

async function quoteWithMelhorEnvio(params: { items: ShippingItem[]; destinationZip: string; originZip: string; }): Promise<ShippingOption[] | null> {
  const token = await getAccessToken();
  if (!token) {
    logger.warn('[shipping] Token do Melhor Envio não encontrado. Vá em Configurações e conecte sua conta.');
    return null;
  }

  const servicesStr = (process.env.MELHOR_ENVIO_SERVICES || '').trim();
  const baseUrl = melhorEnvioBaseUrl();

  // Preparar produtos no formato correto da API do Melhor Envio
  const products = params.items.map((item, index) => {
    const dims = item.dimensions || { height: 12, width: 18, length: 24 };
    const weight = item.weightKg || 1;
    const price = item.price || 0;
    
    return {
      id: item.productId || `produto-${index}`,
      width: Math.max(11, Math.round(dims.width || 11)),
      height: Math.max(2, Math.round(dims.height || 2)),
      length: Math.max(16, Math.round(dims.length || 16)),
      weight: Math.max(0.3, Number(weight.toFixed(2))),
      insurance_value: Number(price.toFixed(2)),
      quantity: item.quantity || 1,
    };
  });

  const body: any = {
    from: { postal_code: params.originZip },
    to: { postal_code: params.destinationZip },
    products,
    options: {
      receipt: false,
      own_hand: false,
    },
  };

  // Se houver serviços específicos, adiciona
  if (servicesStr) {
    body.services = servicesStr;
  }

  logger.info({ body }, '[shipping] Cotação Melhor Envio - Request Body');

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(`${baseUrl}/api/v2/me/shipment/calculate`, {
      method: 'POST',
      headers: { ...commonHeaders(), Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const responseStatus = res.status;
    const responseText = await res.text();
    
    if (!res.ok) {
      logger.error({ status: responseStatus, body: responseText }, '[shipping] Melhor Envio Error Response');
      return null;
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      logger.error(e, `[shipping] Erro ao parsear JSON do Melhor Envio: ${responseText}`);
      return null;
    }

    if (!Array.isArray(data)) {
      logger.warn({ data }, '[shipping] Resposta do Melhor Envio não é um array');
      return null;
    }

    // Mapear opções
    const mapped = data.map((d: any) => {
      const priceValue = Number(d.custom_price || d.price || d.cost || 0);
      const errorMsg = d.error || d.observations || null;
      
      return {
        id: String(d.id || d.service_id || d.name),
        service: d.name || d.delivery_service || 'Frete',
        carrier: d.company?.name || 'Melhor Envio',
        price: roundPrice(priceValue),
        etaDays: d.custom_delivery_time || d.delivery_time || null,
        notes: errorMsg,
      };
    }).filter((o: ShippingOption) => o.price > 0 && !(o.notes && typeof o.notes === 'string' && o.notes.toLowerCase().includes('erro')));

    logger.info({ optionsCount: mapped.length }, '[shipping] Melhor Envio OK. Opções encontradas');
    return mapped;
  } catch (err) {
    logger.error(err, '[shipping] Erro catastrófico na cotação Melhor Envio');
    return null;
  }
}

async function listPickupPointsFromMelhorEnvio(zip: string): Promise<PickupPoint[] | null> {
  const token = await getAccessToken();
  if (!token) return null;

  const baseUrl = melhorEnvioBaseUrl();
  const url = new URL(`${baseUrl}/api/v2/me/pickup-points`);
  url.searchParams.set('postal_code', zip.replace(/\D/g, ''));

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(url.toString(), {
      headers: { ...commonHeaders(), Authorization: `Bearer ${token}` },
      cache: 'no-store',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      logger.warn({ status: res.status, body: body?.slice(0, 300) }, '[shipping] pickup list error');
      return null;
    }


    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const body = await res.text().catch(() => '');
      logger.warn({ status: res.status, body: body?.slice(0, 300) }, '[shipping] pickup list non-json response');
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

    logger.info({ count: mapped.length }, '[shipping] pickup list ok');
    return mapped;
  } catch (err) {
    logger.error(err, '[shipping] melhor envio pickup list failed');
    return null;
  }
}

async function trackWithMelhorEnvio(codes: string[]): Promise<TrackingInfo[] | null> {
  const token = await getAccessToken();
  if (!token || !codes.length) return null;

  const baseUrl = melhorEnvioBaseUrl();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(`${baseUrl}/api/v2/me/tracking`, {
      method: 'POST',
      headers: { ...commonHeaders(), Authorization: `Bearer ${token}` },
      body: JSON.stringify({ codes }),
      cache: 'no-store',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

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
    logger.error(err, '[shipping] melhor envio tracking failed');
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
    // Sempre usar valores do banco de dados quando disponíveis.
    // NÃO confiar em valores enviados pelo cliente para peso/dimensões — isso causava divergências.
    const weight = db?.weight ?? 1;
    const dimensions = parseDimensions(db?.dimensions) ?? { height: 12, width: 18, length: 24 };
    if (!db) {
      console.warn("[shipping] Produto não encontrado no DB para cotação, usando defaults:", item.productId);
    } else if (!db.weight || !db.dimensions) {
      console.warn("[shipping] Produto com dados incompletos no DB (peso/dimensions), usando defaults ou parciais:", { id: db.id, weight: db.weight, dimensions: db.dimensions });
    }
    return {
      ...item,
      name: item.name ?? db?.name ?? "Produto",
      weightKg: weight,
      dimensions,
      price: item.price ?? db?.price ?? 0,
    } as ShippingItem;
  });
}

export async function getShippingOptions(params: { items: ShippingItem[]; destinationZip: string; originZip?: string; }): Promise<ShippingOption[]> {
  logger.info({
    itemsCount: params.items.length,
    destinationZip: params.destinationZip,
    originZip: params.originZip,
  }, '[shipping] getShippingOptions chamado');

  const normalized = await loadShippingItems(params.items);
  logger.info({ normalized }, '[shipping] Itens normalizados');
  
  const originZip = normalizeZip(params.originZip || process.env.SHIPPING_ORIGIN_ZIP || process.env.ORIGIN_ZIP || '44002264');
  logger.info({ originZip }, '[shipping] CEP de Origem final');

  const pickup: ShippingOption = {
    id: 'pickup-feira',
    service: 'Retirada na Loja (Feira de Santana)',
    carrier: 'Loja Física',
    price: 0,
    etaDays: 0,
    pickup: true,
    notes: 'Sem custo, confirmar disponibilidade no balcão',
  };

  const melhorEnvio = await withCircuitBreaker(
    'melhor-envio',
    () => quoteWithMelhorEnvio({ items: normalized, destinationZip: normalizeZip(params.destinationZip), originZip }),
    null,
    { failThreshold: 5, cooldownSec: 60 },
  );
  
  if (melhorEnvio && melhorEnvio.length) {
    logger.info({ count: melhorEnvio.length }, '[shipping] Opções do Melhor Envio recebidas');
    const merged = [...melhorEnvio, pickup];
    const unique = Array.from(new Map(merged.map((o) => [o.id, o])).values());
    return unique;
  }

  logger.warn('[shipping] Nenhuma opção do Melhor Envio, retornando apenas retirada em loja');
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
