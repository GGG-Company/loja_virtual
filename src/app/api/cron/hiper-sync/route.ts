import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { StockSource } from '@prisma/client';
import { getHiperProducts } from '@/lib/hiper';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 min — suficiente para sync de estoque

// Chamado pelo Vercel Cron ou qualquer agendador externo.
// Protegido por CRON_SECRET (igual aos outros crons do projeto).
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    logger.error('[CRON] CRON_SECRET não configurado — rejeitando chamada');
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  // ── Verifica se cron está habilitado nas configurações ───────────────────
  const config = await prisma.hiperSyncConfig.findUnique({ where: { id: 'singleton' } });

  if (!config?.cronEnabled) {
    return NextResponse.json({ skipped: true, reason: 'Sync automático desabilitado' });
  }

  // ── Verifica intervalo mínimo ────────────────────────────────────────────
  const intervalMs = (config.cronIntervalMin ?? 30) * 60 * 1000;
  if (config.lastSyncAt) {
    const elapsed = Date.now() - new Date(config.lastSyncAt).getTime();
    if (elapsed < intervalMs) {
      const waitMin = Math.ceil((intervalMs - elapsed) / 60000);
      return NextResponse.json({ skipped: true, reason: `Aguardando intervalo (${waitMin} min restantes)` });
    }
  }

  logger.info('[HIPER_CRON] Iniciando sync de estoque automático');

  const hiperProducts = await getHiperProducts(0);
  if (!hiperProducts) {
    logger.error('[HIPER_CRON] Falha ao buscar produtos do Hiper');
    return NextResponse.json({ error: 'Falha ao buscar produtos do Hiper' }, { status: 502 });
  }

  // ── Monta lista de variações com estoque ─────────────────────────────────
  type StockEntry = { hiperId: string; ean: string; qty: number };
  const entries: StockEntry[] = [];

  for (const hp of hiperProducts) {
    if (hp.removido || hp.ativo === false) continue;

    const variants: any[] = hp.grade && hp.variacao?.length ? hp.variacao : [hp];
    for (const v of variants) {
      if (v.variacaoAtiva === false) continue;
      const hiperId = String(v.id || hp.id || '');
      if (!hiperId) continue;
      entries.push({
        hiperId,
        ean: String(v.codigoDeBarras || v.codigo || ''),
        qty: Math.max(0, Math.floor(v.quantidadeEmEstoque ?? hp.quantidadeEmEstoque ?? 0)),
      });
    }
  }

  // ── Lookup em lote: todos os produtos locais vinculados ao Hiper ─────────
  const allHiperIds = entries.map(e => e.hiperId).filter(Boolean);
  const allEans     = entries.map(e => e.ean).filter(Boolean);

  const [byHiperId, byEan] = await Promise.all([
    allHiperIds.length > 0
      ? prisma.product.findMany({
          where: { externalIdHiper: { in: allHiperIds } },
          select: { id: true, stock: true, externalIdHiper: true },
        })
      : [],
    allEans.length > 0
      ? prisma.product.findMany({
          where: { ean: { in: allEans } },
          select: { id: true, stock: true, ean: true },
        })
      : [],
  ]);

  const hiperMap = new Map(byHiperId.map(p => [p.externalIdHiper!, p]));
  const eanMap   = new Map(byEan.map(p => [p.ean!, p]));

  // ── Atualiza estoque em lote (apenas produtos já vinculados) ─────────────
  const stockLogQueue: {
    productId: string; previousQty: number; newQty: number;
    difference: number; reason: string; source: StockSource;
  }[] = [];

  const updated = new Set<string>(); // evita atualizar o mesmo produto 2x
  let stockUpdated = 0;
  let errors = 0;

  const updateOps: (() => Promise<void>)[] = [];

  for (const entry of entries) {
    const product = hiperMap.get(entry.hiperId) ?? eanMap.get(entry.ean) ?? null;
    if (!product || updated.has(product.id)) continue;
    updated.add(product.id);

    if (product.stock === entry.qty) continue; // sem mudança

    updateOps.push(async () => {
      try {
        await prisma.product.update({
          where: { id: product.id },
          data: { stock: entry.qty },
        });
        stockLogQueue.push({
          productId: product.id,
          previousQty: product.stock,
          newQty: entry.qty,
          difference: entry.qty - product.stock,
          reason: 'Sync automático Hiper (cron)',
          source: StockSource.HIPER,
        });
        stockUpdated++;
      } catch (err) {
        logger.error(err as Error, '[HIPER_CRON] Erro ao atualizar produto %s', product.id);
        errors++;
      }
    });
  }

  // Executa em lotes de 50 em paralelo
  const CONCURRENCY = 50;
  for (let i = 0; i < updateOps.length; i += CONCURRENCY) {
    await Promise.all(updateOps.slice(i, i + CONCURRENCY).map(fn => fn()));
  }

  if (stockLogQueue.length > 0) {
    await prisma.stockLog.createMany({ data: stockLogQueue, skipDuplicates: true });
  }

  // ── Atualiza metadados da última sync ────────────────────────────────────
  await prisma.hiperSyncConfig.update({
    where: { id: 'singleton' },
    data: { lastSyncAt: new Date(), lastSyncStock: stockUpdated, lastSyncErrors: errors },
  });

  logger.info('[HIPER_CRON] Concluído — stockUpdated:%d errors:%d', stockUpdated, errors);
  return NextResponse.json({
    ok: true,
    totalFromHiper: hiperProducts.length,
    stockUpdated,
    errors,
    syncedAt: new Date().toISOString(),
  });
}
