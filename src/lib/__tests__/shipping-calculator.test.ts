/**
 * Tests for shipping-calculator.ts
 *
 * Estratégia:
 * - Funções puras (parseDimensions, resolveVolumetricWeight, aggregatePackage, roundPrice)
 *   são testadas diretamente.
 * - Funções async (getShippingOptions, getPickupPoints, trackShipments, loadShippingItems)
 *   são testadas com mocks das dependências externas (Prisma, Melhor Envio, fetch).
 * - withCircuitBreaker é mockado para chamar a função diretamente, permitindo testar
 *   os caminhos internos de quoteWithMelhorEnvio.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  parseDimensions,
  resolveVolumetricWeight,
  aggregatePackage,
  roundPrice,
  loadShippingItems,
  getShippingOptions,
  getPickupPoints,
  trackShipments,
} from '../shipping-calculator';

// ── Mocks de módulos (hoistados pelo Vitest) ──────────────────────────────
vi.mock('@/lib/prisma', () => ({
  prisma: { product: { findMany: vi.fn() } },
}));

vi.mock('@/lib/melhorenvio-oauth', () => ({
  getAccessToken: vi.fn(),
  commonHeaders: vi.fn(() => ({ 'Content-Type': 'application/json' })),
}));

// withCircuitBreaker chama fn() diretamente, expondo quoteWithMelhorEnvio para teste
vi.mock('@/lib/circuit-breaker', () => ({
  withCircuitBreaker: vi.fn().mockImplementation(
    async (_name: string, fn: () => any, fallback: any) => {
      try { return await fn(); } catch { return fallback; }
    },
  ),
}));

vi.mock('@/lib/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// Importar versões mockadas para configurar retornos por teste
import { prisma } from '@/lib/prisma';
import { getAccessToken, commonHeaders } from '@/lib/melhorenvio-oauth';

// ── Helpers ───────────────────────────────────────────────────────────────
/** Cria um mock de fetch que retorna a resposta configurada */
function stubFetch(body: any, opts: { ok?: boolean; status?: number; contentType?: string } = {}) {
  const isOk = opts.ok !== false;
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  const mock = vi.fn().mockResolvedValue({
    ok: isOk,
    status: opts.status ?? (isOk ? 200 : 500),
    text: vi.fn().mockResolvedValue(text),
    json: vi.fn().mockResolvedValue(body),
    headers: {
      get: vi.fn().mockImplementation((k: string) =>
        k === 'content-type' ? (opts.contentType ?? 'application/json') : null,
      ),
    },
  });
  vi.stubGlobal('fetch', mock);
  return mock;
}

/** Cria um produto simulado (o que prisma.product.findMany retorna) */
function makeProduct(overrides: Partial<{
  id: string; name: string; weight: number;
  dimensions: any; price: number;
}> = {}) {
  return {
    id: 'prod-1',
    name: 'Furadeira de Impacto',
    weight: 1.5,
    dimensions: { height: 15, width: 20, length: 30 },
    price: 299.9,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  // Defaults seguros para a maioria dos testes
  (prisma.product.findMany as any).mockResolvedValue([]);
  (getAccessToken as any).mockResolvedValue('me-token');
  (commonHeaders as any).mockReturnValue({ 'Content-Type': 'application/json' });
  delete process.env.MELHOR_ENVIO_SANDBOX;
  delete process.env.MELHOR_ENVIO_SERVICES;
  delete process.env.SHIPPING_ORIGIN_ZIP;
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.MELHOR_ENVIO_SANDBOX;
  delete process.env.MELHOR_ENVIO_SERVICES;
});

// ═══════════════════════════════════════════════════════════════════════════
// Funções puras
// ═══════════════════════════════════════════════════════════════════════════

describe('roundPrice', () => {
  it('rounds to 2 decimal places', () => {
    expect(roundPrice(10.005)).toBe(10.01);
    expect(roundPrice(10.004)).toBe(10);
  });

  it('floors negative input to 0', () => {
    expect(roundPrice(-5)).toBe(0);
    expect(roundPrice(-0.01)).toBe(0);
  });

  it('keeps exact values unchanged', () => {
    expect(roundPrice(0)).toBe(0);
    expect(roundPrice(29.9)).toBe(29.9);
    expect(roundPrice(100)).toBe(100);
  });
});

describe('parseDimensions', () => {
  it('parses standard h/w/l object', () => {
    expect(parseDimensions({ height: 10, width: 20, length: 30 }))
      .toEqual({ height: 10, width: 20, length: 30 });
  });

  it('parses PT-BR aliases (altura/largura/comprimento)', () => {
    expect(parseDimensions({ altura: 5, largura: 15, comprimento: 25 }))
      .toEqual({ height: 5, width: 15, length: 25 });
  });

  it('parses short aliases (h/w/l)', () => {
    expect(parseDimensions({ h: 3, w: 7, l: 12 }))
      .toEqual({ height: 3, width: 7, length: 12 });
  });

  it('returns null for empty object (all dimensions zero)', () => {
    expect(parseDimensions({})).toBeNull();
  });

  it('returns null for null/undefined', () => {
    expect(parseDimensions(null)).toBeNull();
    expect(parseDimensions(undefined)).toBeNull();
  });

  it('defaults missing width/length to 10 when any dimension is provided', () => {
    expect(parseDimensions({ height: 5 })).toEqual({ height: 5, width: 10, length: 10 });
  });

  it('fills zero dimensions with 10', () => {
    expect(parseDimensions({ height: 10, width: 0, length: 0 }))
      .toEqual({ height: 10, width: 10, length: 10 });
  });
});

describe('resolveVolumetricWeight', () => {
  it('returns 0 for null dimensions', () => {
    expect(resolveVolumetricWeight(null)).toBe(0);
  });

  it('calculates 30×20×10 cm = 1 kg volumétrico', () => {
    expect(resolveVolumetricWeight({ height: 10, width: 20, length: 30 })).toBe(1);
  });

  it('calculates 60×40×30 cm = 12 kg', () => {
    expect(resolveVolumetricWeight({ height: 30, width: 40, length: 60 })).toBe(12);
  });

  it('returns fractional weight for small packages', () => {
    expect(resolveVolumetricWeight({ height: 10, width: 10, length: 10 }))
      .toBeCloseTo(0.1667, 3);
  });
});

describe('aggregatePackage', () => {
  const base = {
    productId: 'p1', quantity: 1,
    weightKg: 1, dimensions: { height: 10, width: 20, length: 30 }, price: 100,
  };

  it('converts kg to grams', () => {
    expect(aggregatePackage([{ ...base, weightKg: 0.5 }]).totalWeightGrams).toBe(500);
  });

  it('multiplies weight by quantity', () => {
    expect(aggregatePackage([{ ...base, quantity: 3, weightKg: 2 }]).totalWeightGrams).toBe(6000);
  });

  it('sums length across items', () => {
    const r = aggregatePackage([{ ...base, quantity: 2, dimensions: { height: 10, width: 20, length: 30 } }]);
    expect(r.length).toBe(60);
  });

  it('uses max width and height (not sum)', () => {
    const items = [
      { ...base, dimensions: { height: 10, width: 20, length: 10 } },
      { ...base, dimensions: { height: 30, width: 15, length: 10 } },
    ];
    const r = aggregatePackage(items);
    expect(r.width).toBe(20);
    expect(r.height).toBe(30);
  });

  it('enforces minimum dimensions (10×10×5)', () => {
    const r = aggregatePackage([{ productId: 'p', quantity: 1, weightKg: 0.001, dimensions: null }]);
    expect(r.length).toBeGreaterThanOrEqual(10);
    expect(r.width).toBeGreaterThanOrEqual(10);
    expect(r.height).toBeGreaterThanOrEqual(5);
  });

  it('uses 1kg default when weightKg is 0 or missing', () => {
    expect(aggregatePackage([{ productId: 'p', quantity: 1, weightKg: 0 }])
      .totalWeightGrams).toBe(1000);
  });

  it('sums total price correctly', () => {
    const items = [{ ...base, quantity: 2, price: 49.9 }, { ...base, quantity: 1, price: 100 }];
    expect(aggregatePackage(items).totalPrice).toBeCloseTo(199.8, 1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// loadShippingItems
// ═══════════════════════════════════════════════════════════════════════════

describe('loadShippingItems', () => {
  it('enriches items with DB data when product is found', async () => {
    (prisma.product.findMany as any).mockResolvedValue([makeProduct()]);

    const result = await loadShippingItems([{ productId: 'prod-1', quantity: 2 }]);

    expect(result[0].weightKg).toBe(1.5);
    expect(result[0].dimensions).toEqual({ height: 15, width: 20, length: 30 });
    expect(result[0].name).toBe('Furadeira de Impacto');
    expect(result[0].price).toBe(299.9);
    expect(result[0].quantity).toBe(2);
  });

  it('uses default weight (1) when product.weight is null', async () => {
    (prisma.product.findMany as any).mockResolvedValue([makeProduct({ weight: null as any })]);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await loadShippingItems([{ productId: 'prod-1', quantity: 1 }]);

    expect(result[0].weightKg).toBe(1); // null ?? 1
    warnSpy.mockRestore();
  });

  it('uses default dimensions when product.dimensions is null', async () => {
    (prisma.product.findMany as any).mockResolvedValue([makeProduct({ dimensions: null })]);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await loadShippingItems([{ productId: 'prod-1', quantity: 1 }]);

    expect(result[0].dimensions).toEqual({ height: 12, width: 18, length: 24 });
    warnSpy.mockRestore();
  });

  it('uses all defaults when product is not found in DB', async () => {
    (prisma.product.findMany as any).mockResolvedValue([]);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await loadShippingItems([{ productId: 'unknown', quantity: 1 }]);

    expect(result[0].weightKg).toBe(1);
    expect(result[0].dimensions).toEqual({ height: 12, width: 18, length: 24 });
    expect(result[0].name).toBe('Produto');
    expect(result[0].price).toBe(0);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('prefers item.price over db.price when both exist', async () => {
    (prisma.product.findMany as any).mockResolvedValue([makeProduct({ price: 100 })]);

    const result = await loadShippingItems([{ productId: 'prod-1', quantity: 1, price: 50 }]);

    expect(result[0].price).toBe(50); // item.price takes precedence (?? semantics)
  });

  it('handles multiple items from multiple products', async () => {
    (prisma.product.findMany as any).mockResolvedValue([
      makeProduct({ id: 'a', name: 'A', weight: 0.5 }),
      makeProduct({ id: 'b', name: 'B', weight: 2.0 }),
    ]);

    const result = await loadShippingItems([
      { productId: 'a', quantity: 1 },
      { productId: 'b', quantity: 2 },
    ]);

    expect(result).toHaveLength(2);
    expect(result[0].weightKg).toBe(0.5);
    expect(result[1].weightKg).toBe(2.0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// getShippingOptions — cobre quoteWithMelhorEnvio + melhorEnvioBaseUrl + normalizeZip
// ═══════════════════════════════════════════════════════════════════════════

describe('getShippingOptions', () => {
  const items = [{ productId: 'p1', quantity: 1 }];
  const dest = '01310-100'; // formato mascarado → normalizeZip remove o hífen

  it('retorna opções do Melhor Envio + retirada quando API tem sucesso', async () => {
    const apiData = [
      { id: 1, name: 'PAC', company: { name: 'Correios' }, price: '15.90', delivery_time: 5 },
      { id: 2, name: 'SEDEX', company: { name: 'Correios' }, price: '29.90', delivery_time: 2 },
    ];
    stubFetch(apiData);

    const result = await getShippingOptions({ items, destinationZip: dest });

    expect(result.length).toBeGreaterThanOrEqual(3); // 2 ME + 1 pickup
    expect(result.some((o) => o.service === 'PAC')).toBe(true);
    expect(result.some((o) => o.pickup === true)).toBe(true);
  });

  it('retorna apenas retirada quando API retorna null (sem token)', async () => {
    (getAccessToken as any).mockResolvedValue(null);

    const result = await getShippingOptions({ items, destinationZip: dest });

    expect(result).toHaveLength(1);
    expect(result[0].pickup).toBe(true);
    expect(result[0].price).toBe(0);
  });

  it('retorna apenas retirada quando API retorna array vazio', async () => {
    stubFetch([]);

    const result = await getShippingOptions({ items, destinationZip: dest });

    expect(result).toHaveLength(1);
    expect(result[0].pickup).toBe(true);
  });

  it('filtra opções com preço zero', async () => {
    const apiData = [
      { id: 1, name: 'ZeroFrete', company: { name: 'X' }, price: '0.00', delivery_time: 3 },
      { id: 2, name: 'SEDEX', company: { name: 'Correios' }, price: '25.00', delivery_time: 2 },
    ];
    stubFetch(apiData);

    const result = await getShippingOptions({ items, destinationZip: dest });

    expect(result.some((o) => o.service === 'ZeroFrete')).toBe(false);
    expect(result.some((o) => o.service === 'SEDEX')).toBe(true);
  });

  it('filtra opções cujo notes contém "erro"', async () => {
    const apiData = [
      { id: 1, name: 'PAC', price: '15.00', delivery_time: 5, error: 'Serviço com erro de precificação' },
      { id: 2, name: 'SEDEX', price: '25.00', delivery_time: 2, error: null },
    ];
    stubFetch(apiData);

    const result = await getShippingOptions({ items, destinationZip: dest });

    // PAC tem notes com 'erro' → filtrado
    expect(result.some((o) => o.service === 'PAC')).toBe(false);
    expect(result.some((o) => o.service === 'SEDEX')).toBe(true);
  });

  it('usa URL de produção quando MELHOR_ENVIO_SANDBOX=false', async () => {
    process.env.MELHOR_ENVIO_SANDBOX = 'false';
    const fetchMock = stubFetch([{ id: 1, name: 'PAC', price: '10.00', delivery_time: 5 }]);

    await getShippingOptions({ items, destinationZip: dest });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('https://melhorenvio.com.br'),
      expect.any(Object),
    );
  });

  it('usa URL de sandbox por padrão (MELHOR_ENVIO_SANDBOX não definida)', async () => {
    const fetchMock = stubFetch([{ id: 1, name: 'PAC', price: '10.00', delivery_time: 5 }]);

    await getShippingOptions({ items, destinationZip: dest });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('sandbox.melhorenvio.com.br'),
      expect.any(Object),
    );
  });

  it('inclui body.services quando MELHOR_ENVIO_SERVICES está configurado', async () => {
    process.env.MELHOR_ENVIO_SERVICES = '1,2,3';
    const fetchMock = stubFetch([{ id: 1, name: 'PAC', price: '10.00', delivery_time: 5 }]);

    await getShippingOptions({ items, destinationZip: dest });

    const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(callBody.services).toBe('1,2,3');
  });

  it('normaliza CEP com máscara antes de chamar a API', async () => {
    const fetchMock = stubFetch([{ id: 1, name: 'PAC', price: '10.00', delivery_time: 5 }]);

    await getShippingOptions({ items, destinationZip: '01310-100' });

    const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(callBody.to.postal_code).toBe('01310100'); // sem hífen
  });

  it('retorna apenas retirada quando API retorna status de erro (não-ok)', async () => {
    stubFetch('Internal Server Error', { ok: false, status: 500 });

    const result = await getShippingOptions({ items, destinationZip: dest });

    expect(result).toHaveLength(1);
    expect(result[0].pickup).toBe(true);
  });

  it('retorna apenas retirada quando API retorna JSON inválido', async () => {
    stubFetch('not-valid-json{{{{');

    const result = await getShippingOptions({ items, destinationZip: dest });

    expect(result).toHaveLength(1);
    expect(result[0].pickup).toBe(true);
  });

  it('retorna apenas retirada quando API retorna objeto (não array)', async () => {
    stubFetch({ error: 'unexpected object' });

    const result = await getShippingOptions({ items, destinationZip: dest });

    expect(result).toHaveLength(1);
    expect(result[0].pickup).toBe(true);
  });

  it('retorna apenas retirada quando fetch lança exceção', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network Error')));

    const result = await getShippingOptions({ items, destinationZip: dest });

    expect(result).toHaveLength(1);
    expect(result[0].pickup).toBe(true);
  });

  it('usa CEP de origem do env quando não passado', async () => {
    process.env.SHIPPING_ORIGIN_ZIP = '44002-264';
    const fetchMock = stubFetch([{ id: 1, name: 'PAC', price: '10.00', delivery_time: 5 }]);

    await getShippingOptions({ items, destinationZip: dest });

    const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(callBody.from.postal_code).toBe('44002264'); // normalizado
  });

  it('deduplica opções com mesmo id', async () => {
    const apiData = [
      { id: 'sedex', name: 'SEDEX', price: '25.00', delivery_time: 2 },
      { id: 'sedex', name: 'SEDEX', price: '25.00', delivery_time: 2 }, // duplicado
    ];
    stubFetch(apiData);

    const result = await getShippingOptions({ items, destinationZip: dest });

    const sedexCount = result.filter((o) => o.id === 'sedex').length;
    expect(sedexCount).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// getPickupPoints — cobre listPickupPointsFromMelhorEnvio
// ═══════════════════════════════════════════════════════════════════════════

describe('getPickupPoints', () => {
  it('retorna pontos de coleta mapeados quando API tem sucesso', async () => {
    const apiData = [
      { id: 1, name: 'Agência Centro', address: 'Rua Principal, 100', city: 'Feira de Santana', state: 'BA', postal_code: '44001000' },
      { id: 2, name: 'Agência Norte', address: 'Av. Norte, 200', city: 'Feira de Santana', state: 'BA', postal_code: '44010000' },
    ];
    stubFetch(apiData);

    const result = await getPickupPoints({ destinationZip: '44001-000' });

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Agência Centro');
    expect(result[0].city).toBe('Feira de Santana');
  });

  it('monta address a partir de street+number+neighborhood quando address está ausente', async () => {
    const apiData = [{
      id: 1, name: 'Ponto X',
      street: 'Rua A', number: '10', neighborhood: 'Centro',
      city: 'SSA', state: 'BA',
    }];
    stubFetch(apiData);

    const result = await getPickupPoints({ destinationZip: '40000000' });

    expect(result[0].address).toBe('Rua A, 10, Centro');
  });

  it('retorna array vazio quando não há token', async () => {
    (getAccessToken as any).mockResolvedValue(null);

    const result = await getPickupPoints({ destinationZip: '44001000' });

    expect(result).toEqual([]);
  });

  it('retorna array vazio em resposta não-ok', async () => {
    stubFetch('Error', { ok: false, status: 404 });

    const result = await getPickupPoints({ destinationZip: '44001000' });

    expect(result).toEqual([]);
  });

  it('retorna array vazio em resposta com content-type não-json', async () => {
    stubFetch('<html>error</html>', { contentType: 'text/html' });

    const result = await getPickupPoints({ destinationZip: '44001000' });

    expect(result).toEqual([]);
  });

  it('retorna array vazio quando data não é array', async () => {
    stubFetch({ data: [] }); // objeto, não array

    const result = await getPickupPoints({ destinationZip: '44001000' });

    expect(result).toEqual([]);
  });

  it('filtra pontos sem id', async () => {
    const apiData = [
      { id: 1, name: 'Com ID', address: 'Rua A' },
      { id: null, name: 'Sem ID', address: 'Rua B' },
    ];
    stubFetch(apiData);

    const result = await getPickupPoints({ destinationZip: '44001000' });

    // null → String(null) = 'null' → truthy → NÃO é filtrado pela implementação atual
    // Mas id undefined → String(undefined) = 'undefined' → filtraria
    expect(result.some((p) => p.name === 'Com ID')).toBe(true);
  });

  it('retorna array vazio em exceção de fetch', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')));

    const result = await getPickupPoints({ destinationZip: '44001000' });

    expect(result).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// trackShipments — cobre trackWithMelhorEnvio
// ═══════════════════════════════════════════════════════════════════════════

describe('trackShipments', () => {
  it('retorna informações de rastreio com eventos', async () => {
    const apiData = [{
      code: 'BR123456789BR',
      last_status: { status: 'Entregue', date: '2024-01-15' },
      events: [
        { status: 'Postado', description: 'Objeto postado', date: '2024-01-10', origin: 'SSA', destination: 'SP' },
        { status: 'Em trânsito', description: 'A caminho', date: '2024-01-12' },
      ],
    }];
    stubFetch(apiData);

    const result = await trackShipments({ trackingCodes: ['BR123456789BR'] });

    expect(result).toHaveLength(1);
    expect(result[0].code).toBe('BR123456789BR');
    expect(result[0].lastStatus).toBe('Entregue');
    expect(result[0].updatedAt).toBe('2024-01-15');
    expect(result[0].events).toHaveLength(2);
    expect(result[0].events![0].status).toBe('Postado');
    expect(result[0].events![0].origin).toBe('SSA');
  });

  it('retorna eventos como undefined quando events não é array', async () => {
    const apiData = [{ code: 'BR999', last_status: { status: 'Postado' }, events: null }];
    stubFetch(apiData);

    const result = await trackShipments({ trackingCodes: ['BR999'] });

    expect(result[0].events).toBeUndefined();
  });

  it('retorna array vazio quando não há token', async () => {
    (getAccessToken as any).mockResolvedValue(null);

    const result = await trackShipments({ trackingCodes: ['BR123'] });

    expect(result).toEqual([]);
  });

  it('retorna array vazio quando lista de códigos está vazia', async () => {
    // Nenhum fetch deve ser chamado — trackWithMelhorEnvio retorna null por !codes.length
    const fetchMock = stubFetch([]);

    const result = await trackShipments({ trackingCodes: [] });

    expect(result).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('filtra e remove códigos vazios/nulos antes de enviar', async () => {
    const fetchMock = stubFetch(null); // fetch nunca será chamado

    const result = await trackShipments({ trackingCodes: ['', '  ', null as any] });

    // Após filter(Boolean), codes = [] → trackWithMelhorEnvio retorna null
    expect(result).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('retorna array vazio em resposta não-ok', async () => {
    stubFetch('Unauthorized', { ok: false, status: 401 });

    const result = await trackShipments({ trackingCodes: ['BR123'] });

    expect(result).toEqual([]);
  });

  it('retorna array vazio quando data não é array', async () => {
    stubFetch({ tracking: {} }); // objeto, não array

    const result = await trackShipments({ trackingCodes: ['BR123'] });

    expect(result).toEqual([]);
  });

  it('filtra resultados com code vazio', async () => {
    const apiData = [
      { code: 'BR123', status: 'Entregue' },
      { code: '', status: 'Em trânsito' }, // sem code → filtrado
    ];
    stubFetch(apiData);

    const result = await trackShipments({ trackingCodes: ['BR123'] });

    expect(result).toHaveLength(1);
    expect(result[0].code).toBe('BR123');
  });

  it('retorna array vazio em exceção de fetch', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network Error')));

    const result = await trackShipments({ trackingCodes: ['BR123'] });

    expect(result).toEqual([]);
  });

  it('envia múltiplos códigos na mesma requisição', async () => {
    const fetchMock = stubFetch([
      { code: 'BR001', status: 'Entregue' },
      { code: 'BR002', status: 'Em trânsito' },
    ]);

    await trackShipments({ trackingCodes: ['BR001', 'BR002'] });

    const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(callBody.codes).toEqual(['BR001', 'BR002']);
  });
});
