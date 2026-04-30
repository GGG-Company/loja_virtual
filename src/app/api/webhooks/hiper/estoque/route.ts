import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

// ── Tipos do payload Hiper ────────────────────────────────────────────────────

// Notificação de estoque avulsa (produto único)
interface HiperEstoquePayload {
  ProdutoId?: string;
  produtoId?: string;
  CodigoDeBarras?: string;
  codigoDeBarras?: string;
  Sku?: string;
  sku?: string;
  QuantidadeAtual?: number;
  quantidadeAtual?: number;
  Tipo?: string;
  tipo?: string;
}

// Notificação de venda (múltiplos itens)
interface HiperVendaPayload {
  Tipo?: string;
  tipo?: string;
  Itens?: HiperVendaItem[];
  itens?: HiperVendaItem[];
}

interface HiperVendaItem {
  ProdutoId?: string;
  produtoId?: string;
  CodigoDeBarras?: string;
  codigoDeBarras?: string;
  Sku?: string;
  sku?: string;
  Quantidade?: number;
  quantidade?: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getField<T>(obj: Record<string, T>, ...keys: string[]): T | undefined {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return undefined;
}

async function findProduct(hiperIdOrEanOrSku: {
  hiperId?: string;
  ean?: string;
  sku?: string;
}) {
  const { hiperId, ean, sku } = hiperIdOrEanOrSku;

  const orClauses: object[] = [];
  if (hiperId) orClauses.push({ externalIdHiper: hiperId });
  if (ean)     orClauses.push({ ean });
  if (sku)     orClauses.push({ sku });

  if (orClauses.length === 0) return null;

  return prisma.product.findFirst({
    where: { OR: orClauses, isActive: true },
    select: { id: true, stock: true, name: true },
  });
}

async function updateStock(
  productId: string,
  previousQty: number,
  newQty: number,
  reason: string,
) {
  await prisma.product.update({
    where: { id: productId },
    data: { stock: newQty },
  });

  await prisma.stockLog.create({
    data: {
      productId,
      previousQty,
      newQty,
      difference: newQty - previousQty,
      reason,
      source: 'HIPER',
    },
  });
}

// ── Validação do secret ───────────────────────────────────────────────────────

function validateSecret(req: NextRequest): boolean {
  const secret = process.env.HIPER_WEBHOOK_SECRET;
  if (!secret) {
    // Sem secret configurado — aceita qualquer chamada (útil em dev)
    logger.warn('[HIPER_WEBHOOK] HIPER_WEBHOOK_SECRET não configurado — endpoint sem autenticação');
    return true;
  }

  // Aceita via header x-hiper-secret, x-api-key, Authorization ou query param secret
  const fromHeader =
    req.headers.get('x-hiper-secret') ||
    req.headers.get('x-api-key') ||
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const fromQuery = new URL(req.url).searchParams.get('secret');

  return fromHeader === secret || fromQuery === secret;
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!validateSecret(req)) {
    logger.warn('[HIPER_WEBHOOK] Chamada rejeitada — secret inválido');
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  // Verifica se webhook está habilitado nas configurações
  const config = await prisma.hiperSyncConfig.findUnique({ where: { id: 'singleton' } });
  if (config && !config.webhookEnabled) {
    logger.info('[HIPER_WEBHOOK] Webhook desabilitado nas configurações');
    return NextResponse.json({ skipped: true, reason: 'Webhook desabilitado' });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 });
  }

  logger.info({ body }, '[HIPER_WEBHOOK] Payload recebido');

  const tipo = String(
    getField(body as any, 'tipo', 'Tipo') ?? ''
  ).toUpperCase();

  // ── Caso 1: Notificação de venda (múltiplos itens) ───────────────────────
  const itens = getField(body as any, 'itens', 'Itens') as HiperVendaItem[] | undefined;
  if (Array.isArray(itens) && itens.length > 0) {
    const results: { name: string; status: string }[] = [];

    for (const item of itens) {
      const it = item as Record<string, unknown>;
      const hiperId   = getField(it, 'produtoId', 'ProdutoId') as string | undefined;
      const ean       = getField(it, 'codigoDeBarras', 'CodigoDeBarras') as string | undefined;
      const sku       = getField(it, 'sku', 'Sku') as string | undefined;
      const qtdVendida = Number(getField(it, 'quantidade', 'Quantidade') ?? 0);

      const product = await findProduct({ hiperId, ean, sku });
      if (!product) {
        logger.warn({ hiperId, ean, sku }, '[HIPER_WEBHOOK] Produto não encontrado');
        results.push({ name: hiperId ?? ean ?? sku ?? '?', status: 'not_found' });
        continue;
      }

      const newQty = Math.max(0, product.stock - qtdVendida);
      await updateStock(product.id, product.stock, newQty, `Venda loja física — Webhook Hiper (${tipo || 'VENDA'})`);
      results.push({ name: product.name, status: 'updated' });
      logger.info('[HIPER_WEBHOOK] Estoque atualizado: %s %d→%d', product.name, product.stock, newQty);
    }

    return NextResponse.json({ ok: true, processed: results.length, results });
  }

  // ── Caso 2: Notificação de estoque único ─────────────────────────────────
  const hiperId      = getField(body as any, 'produtoId', 'ProdutoId') as string | undefined;
  const ean          = getField(body as any, 'codigoDeBarras', 'CodigoDeBarras') as string | undefined;
  const sku          = getField(body as any, 'sku', 'Sku') as string | undefined;
  const qtdAtual     = getField(body as any, 'quantidadeAtual', 'QuantidadeAtual') as number | undefined;

  if (qtdAtual === undefined || (!hiperId && !ean && !sku)) {
    logger.warn({ body }, '[HIPER_WEBHOOK] Payload não reconhecido');
    return NextResponse.json(
      { error: 'Payload não reconhecido. Envie quantidadeAtual + (produtoId | codigoDeBarras | sku)' },
      { status: 422 }
    );
  }

  const product = await findProduct({ hiperId, ean, sku });
  if (!product) {
    logger.warn({ hiperId, ean, sku }, '[HIPER_WEBHOOK] Produto não encontrado');
    return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
  }

  const newQty = Math.max(0, Math.floor(Number(qtdAtual)));
  await updateStock(
    product.id,
    product.stock,
    newQty,
    `Atualização estoque — Webhook Hiper (${tipo || 'ESTOQUE'})`,
  );

  logger.info('[HIPER_WEBHOOK] Estoque atualizado: %s %d→%d', product.name, product.stock, newQty);
  return NextResponse.json({ ok: true, product: product.name, previousQty: product.stock, newQty });
}

// GET — health check (para o Hiper validar a URL do webhook)
export async function GET(req: NextRequest) {
  if (!validateSecret(req)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  return NextResponse.json({ ok: true, webhook: 'hiper/estoque', ts: new Date().toISOString() });
}
