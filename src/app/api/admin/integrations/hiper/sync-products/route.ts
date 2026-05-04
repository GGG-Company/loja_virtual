import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { getHiperProducts, invalidateHiperProductsCache, invalidateHiperToken } from '@/lib/hiper';
import logger from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

// Resolve categoria pelo nome vindo do Hiper, criando se não existir.
// Usa cache para evitar upserts repetidos ao longo do batch.
async function resolveCategory(
  nome: string | null | undefined,
  cache: Map<string, string>,
): Promise<string> {
  const name = nome?.trim() || '';
  const cacheKey = name ? toSlug(name) : '\x00';

  const cached = cache.get(cacheKey);
  if (cached) return cached;

  let id: string;
  if (name) {
    const slug = toSlug(name);
    const cat = await prisma.category.upsert({
      where: { slug },
      create: { name, slug },
      update: {},
      select: { id: true },
    });
    id = cat.id;
  } else {
    const fallback = await prisma.category.upsert({
      where: { slug: 'importados-hiper' },
      create: { name: 'Importados do Hiper', slug: 'importados-hiper' },
      update: {},
      select: { id: true },
    });
    id = fallback.id;
  }

  cache.set(cacheKey, id);
  return id;
}

// Resolve marca pelo nome vindo do Hiper, criando se não existir.
// Retorna undefined quando Hiper não informa marca (produto fica sem alteração na marca).
async function resolveBrand(
  nome: string | null | undefined,
  cache: Map<string, string>,
): Promise<string | undefined> {
  const name = nome?.trim();
  if (!name) return undefined;

  const slug = toSlug(name);
  const cached = cache.get(slug);
  if (cached) return cached;

  const brand = await prisma.brand.upsert({
    where: { slug },
    create: { name, slug },
    update: {},
    select: { id: true },
  });

  cache.set(slug, brand.id);
  return brand.id;
}

async function checkAdmin() {
  const session = await auth();
  if (!session?.user) return false;
  const role = (session.user as { role?: string }).role;
  return role === 'ADMIN' || role === 'OWNER';
}

// GET — status da integração
export async function GET() {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const [total, linked] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { externalIdHiper: { not: null } } }),
  ]);

  return NextResponse.json({ total, linked, unlinked: total - linked });
}

// POST — sincroniza produtos do Hiper com os produtos locais
// Body: { pontoDeSincronizacao?: number, syncStock?: boolean, syncMeta?: boolean,
//         createNew?: boolean, limit?: number, offset?: number }
export async function POST(req: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const pontoDeSincronizacao: number = body.pontoDeSincronizacao ?? 0;
  const syncStock: boolean  = body.syncStock  ?? true;
  const syncMeta: boolean   = body.syncMeta   ?? true;
  const createNew: boolean  = body.createNew  ?? true;
  const limit: number       = body.limit      ?? 2000;
  const offset: number      = body.offset     ?? 0;

  logger.info('[HIPER_SYNC] Iniciando sync (pds=%d, offset=%d, limit=%d)', pontoDeSincronizacao, offset, limit);

  // Sempre gera token novo a cada sync — não depende de HIPER_API_TOKEN no env
  if (offset === 0) invalidateHiperToken();

  const allHiperProducts = await getHiperProducts(pontoDeSincronizacao);
  if (!allHiperProducts) {
    return NextResponse.json({ error: 'Falha ao buscar produtos do Hiper' }, { status: 502 });
  }

  const totalFromHiper = allHiperProducts.length;
  const hiperProducts  = allHiperProducts.slice(offset, offset + limit);
  const hasMore        = offset + limit < totalFromHiper;

  logger.info('[HIPER_SYNC] %d produtos no Hiper, processando %d-%d', totalFromHiper, offset, offset + hiperProducts.length);

  const categoryCache = new Map<string, string>();
  const brandCache    = new Map<string, string>();

  let matched      = 0;
  let created      = 0;
  let unmatched    = 0;
  let stockUpdated = 0;
  let deactivated  = 0;
  let errors       = 0;
  let maxSyncPoint = pontoDeSincronizacao;

  // ── Passo 1: expandir variações ativas e coletar IDs para lookup em lote ──
  type VariantRow = { hiperId: string; eanHiper: string; hp: any; variant: any };
  const rows: VariantRow[] = [];

  for (const hp of hiperProducts) {
    if (hp.pontoDeSincronizacao > maxSyncPoint) maxSyncPoint = hp.pontoDeSincronizacao;
    if (hp.removido || hp.ativo === false) continue;

    const candidates: any[] = hp.grade && hp.variacao?.length ? hp.variacao : [hp];
    for (const variant of candidates) {
      if (variant.variacaoAtiva === false) continue;
      const hiperId: string = String(variant.id || hp.id || '');
      if (!hiperId) continue;
      const eanHiper = String(variant.codigoDeBarras || variant.codigo || '');
      rows.push({ hiperId, eanHiper, hp, variant });
    }
  }

  // ── Passo 2: 2 queries para todos os lookups do batch (em vez de N×2) ────
  const allHiperIds = rows.map(r => r.hiperId);
  const allEans     = rows.map(r => r.eanHiper).filter(Boolean);

  const [byHiperId, byEanSku] = await Promise.all([
    allHiperIds.length > 0
      ? prisma.product.findMany({
          where: { externalIdHiper: { in: allHiperIds } },
          select: { id: true, sku: true, stock: true, imageUrl: true, description: true, externalIdHiper: true },
        })
      : [],
    allEans.length > 0
      ? prisma.product.findMany({
          where: { OR: [{ ean: { in: allEans } }, { sku: { in: allEans } }] },
          select: { id: true, sku: true, stock: true, imageUrl: true, description: true, ean: true },
        })
      : [],
  ]);

  const hiperIdMap = new Map<string, (typeof byHiperId)[0]>(
    byHiperId.map(p => [p.externalIdHiper!, p]),
  );
  const eanSkuMap = new Map<string, (typeof byEanSku)[0]>();
  for (const p of byEanSku) {
    if (p.ean) eanSkuMap.set(p.ean, p);
    if (p.sku) eanSkuMap.set(p.sku, p);
  }

  // ── Passo 3: separar creates de updates ──────────────────────────────────
  // Updates são seguros em paralelo (cada um tem um id único).
  // Creates NÃO podem ser paralelos: dois produtos com mesmo nome/código fariam
  // findUnique simultâneo, ambos veriam slug/sku livre, e um deles falharia com P2002.

  const stockLogQueue: Prisma.StockLogCreateManyInput[] = [];

  type MatchedRow = { row: VariantRow; product: (typeof byHiperId)[0] | (typeof byEanSku)[0] };
  const toUpdate: MatchedRow[] = [];
  const toCreate: VariantRow[] = [];

  for (const row of rows) {
    const product = hiperIdMap.get(row.hiperId) ?? (row.eanHiper ? eanSkuMap.get(row.eanHiper) : undefined) ?? null;
    if (product) {
      toUpdate.push({ row, product });
    } else if (createNew) {
      toCreate.push(row);
    } else {
      unmatched++;
    }
  }

  // ── Updates em paralelo (CONCURRENCY=50) ─────────────────────────────────
  async function processUpdate({ row: { hiperId, eanHiper, hp, variant }, product }: MatchedRow): Promise<void> {
    const [categoryId, brandId] = await Promise.all([
      resolveCategory(hp.categoria, categoryCache),
      resolveBrand(hp.marca || hp.fabricante, brandCache),
    ]);

    const stockQty = syncStock
      ? Math.max(0, Math.floor(variant.quantidadeEmEstoque ?? hp.quantidadeEmEstoque ?? 0))
      : undefined;

    const updateData: Record<string, unknown> = {
      externalIdHiper: hiperId,
      isActive: true,
      categoryId,
      ...(eanHiper && { ean: eanHiper }),
      ...(brandId  && { brandId }),
      ...(stockQty !== undefined && { stock: stockQty }),
    };

    if (syncMeta) {
      const hiperImagem = hp.imagem || variant.imagem;
      if (hiperImagem && !product.imageUrl) updateData.imageUrl = hiperImagem;

      const hiperDescricao = hp.descricao || variant.descricao;
      if (hiperDescricao && (!product.description || product.description.trim() === '')) {
        updateData.description = hiperDescricao;
      }

      if (hp.ncm) updateData.ncm = hp.ncm;

      const peso = variant.peso ?? hp.peso;
      if (peso != null && peso > 0) updateData.weight = Number(peso);

      const altura      = variant.altura      ?? hp.altura;
      const largura     = variant.largura     ?? hp.largura;
      const comprimento = variant.comprimento ?? hp.comprimento;
      if (altura || largura || comprimento) {
        updateData.dimensions = {
          height: Number(altura      ?? 0),
          width:  Number(largura     ?? 0),
          length: Number(comprimento ?? 0),
        };
      }
    }

    await prisma.product.update({ where: { id: product.id }, data: updateData });
    matched++;

    if (syncStock && stockQty !== undefined) {
      stockLogQueue.push({
        productId: product.id,
        previousQty: product.stock ?? 0,
        newQty: stockQty,
        difference: stockQty - (product.stock ?? 0),
        reason: 'Sync Hiper', source: 'HIPER',
      });
      stockUpdated++;
    }
  }

  const CONCURRENCY = 50;
  for (let i = 0; i < toUpdate.length; i += CONCURRENCY) {
    const results = await Promise.allSettled(
      toUpdate.slice(i, i + CONCURRENCY).map(m => processUpdate(m)),
    );
    for (const r of results) {
      if (r.status === 'rejected') {
        logger.error(r.reason, '[HIPER_SYNC] Erro ao atualizar produto');
        errors++;
      }
    }
  }

  // ── Creates sequenciais — evita race condition em slug/sku ───────────────
  // Mantém um Set local dos slugs/skus já usados neste batch para que dois
  // produtos com o mesmo nome base não colidam mesmo sem bater no banco.
  const usedSlugs = new Set<string>();
  const usedSkus  = new Set<string>();

  for (const { hiperId, eanHiper, hp, variant } of toCreate) {
    try {
      const [categoryId, brandId] = await Promise.all([
        resolveCategory(hp.categoria, categoryCache),
        resolveBrand(hp.marca || hp.fabricante, brandCache),
      ]);

      const nomeProduto: string = hp.grade && variant !== hp
        ? `${hp.nome ?? 'Produto'} — ${variant.nomeVariacaoA ?? ''}${variant.nomeVariacaoB ? ` / ${variant.nomeVariacaoB}` : ''}`.trim()
        : (hp.nome ?? 'Produto sem nome');

      const skuBase  = `HIR-${variant.codigo ?? hp.codigo ?? hiperId}`;
      const slugBase = toSlug(nomeProduto).slice(0, 80);

      // Resolve SKU — verifica Set local antes de ir ao banco
      let skuFinal = skuBase;
      if (usedSkus.has(skuBase)) {
        skuFinal = `${skuBase}-${Date.now()}`;
      } else {
        const skuExists = await prisma.product.findUnique({ where: { sku: skuBase }, select: { id: true } });
        if (skuExists) skuFinal = `${skuBase}-${Date.now()}`;
      }
      usedSkus.add(skuFinal);

      // Resolve slug — verifica Set local antes de ir ao banco
      let slugFinal = slugBase;
      if (usedSlugs.has(slugBase)) {
        slugFinal = `${slugBase}-${Date.now()}`;
      } else {
        const slugExists = await prisma.product.findUnique({ where: { slug: slugBase }, select: { id: true } });
        if (slugExists) slugFinal = `${slugBase}-${Date.now()}`;
      }
      usedSlugs.add(slugFinal);

      const preco    = Number(hp.preco ?? variant.preco ?? 0);
      const stockQty = Math.max(0, Math.floor(variant.quantidadeEmEstoque ?? hp.quantidadeEmEstoque ?? 0));

      const newProduct = await prisma.product.create({
        data: {
          sku: skuFinal, slug: slugFinal, name: nomeProduto,
          price: preco > 0 ? preco : 0.01,
          stock: stockQty,
          ean: eanHiper || undefined,
          externalIdHiper: hiperId,
          isActive: true,
          categoryId,
          ...(brandId ? { brandId } : {}),
          ...(hp.ncm ? { ncm: hp.ncm } : {}),
          ...(hp.imagem || variant.imagem ? { imageUrl: hp.imagem ?? variant.imagem } : {}),
          ...(hp.descricao || variant.descricao ? { description: hp.descricao ?? variant.descricao } : {}),
          ...(hp.peso ?? variant.peso ? { weight: Number(hp.peso ?? variant.peso) } : {}),
          ...((hp.altura || hp.largura || hp.comprimento) ? {
            dimensions: {
              height: Number(hp.altura ?? 0),
              width:  Number(hp.largura ?? 0),
              length: Number(hp.comprimento ?? 0),
            },
          } : {}),
        },
        select: { id: true, stock: true },
      });

      if (syncStock && newProduct.stock > 0) {
        stockLogQueue.push({
          productId: newProduct.id,
          previousQty: 0, newQty: newProduct.stock, difference: newProduct.stock,
          reason: 'Criado via Sync Hiper', source: 'HIPER',
        });
      }
      created++;
    } catch (err) {
      logger.error(err as Error, '[HIPER_SYNC] Erro ao criar produto hiperId=%s', hiperId);
      errors++;
    }
  }

  // Persiste todos os stockLogs em paralelo
  if (stockLogQueue.length > 0) {
    await prisma.stockLog.createMany({ data: stockLogQueue, skipDuplicates: true });
  }

  // ── Desativar produtos que sumiram do Hiper ───────────────────────────────
  // Feito apenas no último batch (hasMore=false) quando temos a visão completa.
  if (!hasMore) {
    // Monta o set de todos os IDs ativos no Hiper (inclusive variações)
    const activeHiperIdSet = new Set<string>();
    for (const hp of allHiperProducts) {
      if (hp.removido || hp.ativo === false) continue;
      const candidates: any[] = hp.grade && hp.variacao?.length ? hp.variacao : [hp];
      for (const variant of candidates) {
        if (variant.variacaoAtiva === false) continue;
        const id = String(variant.id || hp.id || '');
        if (id) activeHiperIdSet.add(id);
      }
    }

    // Busca produtos da loja que estão vinculados ao Hiper e ainda ativos
    const stillLinked = await prisma.product.findMany({
      where: { externalIdHiper: { not: null }, isActive: true },
      select: { id: true, stock: true, externalIdHiper: true },
    });

    // Os que não aparecem mais no Hiper ativo → desativar
    const disappeared = stillLinked.filter(p => !activeHiperIdSet.has(p.externalIdHiper!));

    if (disappeared.length > 0) {
      const disappearedIds = disappeared.map(p => p.id);
      await prisma.product.updateMany({
        where: { id: { in: disappearedIds } },
        data: { isActive: false, stock: 0 },
      });
      deactivated += disappeared.length;

      // Loga a zeragem de estoque para histórico
      const deactLogs = disappeared
        .filter(p => p.stock > 0)
        .map(p => ({
          productId: p.id,
          previousQty: p.stock,
          newQty: 0,
          difference: -p.stock,
          reason: 'Removido/inativo no Hiper',
          source: 'HIPER',
        }));
      if (deactLogs.length > 0) {
        await prisma.stockLog.createMany({ data: deactLogs, skipDuplicates: true });
      }

      logger.info('[HIPER_SYNC] %d produtos desativados (sumiram do Hiper)', disappeared.length);
    }

    invalidateHiperProductsCache();
  }

  logger.info(
    '[HIPER_SYNC] Concluído — matched:%d created:%d unmatched:%d stockUpdated:%d deactivated:%d errors:%d nextPoint:%d',
    matched, created, unmatched, stockUpdated, deactivated, errors, maxSyncPoint,
  );

  return NextResponse.json({
    matched, created, unmatched, stockUpdated, deactivated, errors,
    totalFromHiper,
    processedOffset: offset,
    processedCount: hiperProducts.length,
    hasMore,
    nextOffset: hasMore ? offset + limit : null,
    nextPontoDeSincronizacao: maxSyncPoint,
  });
}
