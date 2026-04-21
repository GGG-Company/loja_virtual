import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getHiperProducts, getHiperStock } from '@/lib/hiper';
import logger from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function checkAdmin() {
  const session = await auth();
  if (!session?.user) return false;
  const role = (session.user as { role?: string }).role;
  return role === 'ADMIN' || role === 'OWNER';
}

// GET — retorna status da integração (quantos produtos têm hiperOrderId)
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
// Body (opcional): { pontoDeSincronizacao?: number, syncStock?: boolean }
export async function POST(req: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const pontoDeSincronizacao: number = body.pontoDeSincronizacao ?? 0;
  const syncStock: boolean = body.syncStock ?? true;

  logger.info('[HIPER_SYNC] Iniciando sync de produtos (pontoDeSincronizacao=%d)', pontoDeSincronizacao);

  const hiperProducts = await getHiperProducts(pontoDeSincronizacao);
  if (!hiperProducts) {
    return NextResponse.json({ error: 'Falha ao buscar produtos do Hiper' }, { status: 502 });
  }

  logger.info('[HIPER_SYNC] %d produtos recebidos do Hiper', hiperProducts.length);

  // Limpa todos os vínculos antes de re-vincular apenas o que veio do Hiper
  await prisma.product.updateMany({ data: { externalIdHiper: null } });
  logger.info('[HIPER_SYNC] Vínculos anteriores removidos');

  let matched = 0;
  let unmatched = 0;
  let stockUpdated = 0;
  let errors = 0;
  let maxSyncPoint = pontoDeSincronizacao;

  for (const hp of hiperProducts) {
    if (hp.pontoDeSincronizacao > maxSyncPoint) maxSyncPoint = hp.pontoDeSincronizacao;

    // Produto pai com grade: usar as variações (filhos)
    const candidates: typeof hp[] = hp.grade && hp.variacao?.length ? hp.variacao : [hp];

    for (const variant of candidates) {
      const hiperSku = String(variant.codigoDeBarras || variant.codigo || '');
      const hiperId: string = variant.id || hp.id;

      if (!hiperId) continue;

      try {
        // Tenta localizar pelo EAN (codigoDeBarras) ou pelo SKU
        let product = await prisma.product.findFirst({
          where: {
            OR: [
              { ean: hiperSku },
              { sku: hiperSku },
            ],
          },
          select: { id: true, sku: true, stock: true },
        });

        if (!product) {
          // Fallback: busca pelo nome do produto pai
          product = await prisma.product.findFirst({
            where: { name: { contains: hp.nome, mode: 'insensitive' } },
            select: { id: true, sku: true, stock: true },
          });
        }

        if (!product) {
          unmatched++;
          continue;
        }

        // Atualizar externalIdHiper
        await prisma.product.update({
          where: { id: product.id },
          data: { externalIdHiper: hiperId },
        });
        matched++;

        // Sincronizar estoque se solicitado
        if (syncStock) {
          const stockQty = Math.max(0, Math.floor(variant.quantidadeEmEstoque ?? hp.quantidadeEmEstoque ?? 0));

          await prisma.product.update({
            where: { id: product.id },
            data: { stock: stockQty },
          });

          const prev = product.stock ?? 0;
          await prisma.stockLog.create({
            data: {
              productId: product.id,
              previousQty: prev,
              newQty: stockQty,
              difference: stockQty - prev,
              reason: 'Sync Hiper',
              source: 'HIPER',
            },
          });

          stockUpdated++;
        }
      } catch (err) {
        logger.error(err as Error, '[HIPER_SYNC] Erro ao processar produto %s', hiperId);
        errors++;
      }
    }
  }

  logger.info(
    '[HIPER_SYNC] Concluído — matched:%d unmatched:%d stockUpdated:%d errors:%d nextPoint:%d',
    matched, unmatched, stockUpdated, errors, maxSyncPoint,
  );

  return NextResponse.json({
    matched,
    unmatched,
    stockUpdated,
    errors,
    nextPontoDeSincronizacao: maxSyncPoint,
  });
}
