import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getHiperProducts } from '@/lib/hiper';
import logger from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
// Body: { pontoDeSincronizacao?: number, syncStock?: boolean, syncMeta?: boolean }
//   syncMeta: atualiza imagem, NCM, peso, dimensões, descrição (default: true)
export async function POST(req: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const pontoDeSincronizacao: number = body.pontoDeSincronizacao ?? 0;
  const syncStock: boolean = body.syncStock ?? true;
  const syncMeta: boolean = body.syncMeta ?? true;

  logger.info('[HIPER_SYNC] Iniciando sync (pontoDeSincronizacao=%d)', pontoDeSincronizacao);

  const hiperProducts = await getHiperProducts(pontoDeSincronizacao);
  if (!hiperProducts) {
    return NextResponse.json({ error: 'Falha ao buscar produtos do Hiper' }, { status: 502 });
  }

  logger.info('[HIPER_SYNC] %d produtos recebidos do Hiper', hiperProducts.length);

  // Sync completo: limpa todos os vínculos para re-vincular do zero
  // Sync incremental: mantém vínculos existentes (só atualiza os que chegaram)
  if (pontoDeSincronizacao === 0) {
    await prisma.product.updateMany({ data: { externalIdHiper: null } });
  }

  let matched = 0;
  let unmatched = 0;
  let stockUpdated = 0;
  let deactivated = 0;
  let errors = 0;
  let maxSyncPoint = pontoDeSincronizacao;

  for (const hp of hiperProducts) {
    if (hp.pontoDeSincronizacao > maxSyncPoint) maxSyncPoint = hp.pontoDeSincronizacao;

    // Produto marcado como removido do e-commerce — desativar se existir localmente
    if (hp.removido) {
      try {
        const found = await prisma.product.findFirst({
          where: {
            OR: [
              { ean: String(hp.codigoDeBarras || '') },
              { sku: String(hp.codigoDeBarras || '') },
              { name: { contains: hp.nome, mode: 'insensitive' } },
            ],
          },
          select: { id: true },
        });
        if (found) {
          await prisma.product.update({
            where: { id: found.id },
            data: { isActive: false, externalIdHiper: null },
          });
          deactivated++;
        }
      } catch (err) {
        logger.error(err as Error, '[HIPER_SYNC] Erro ao desativar produto removido %s', hp.id);
      }
      continue;
    }

    // Produto pai com grade: usar as variações (filhos)
    const candidates: typeof hp[] = hp.grade && hp.variacao?.length ? hp.variacao : [hp];

    for (const variant of candidates) {
      const eanHiper = String(variant.codigoDeBarras || variant.codigo || '');
      const hiperId: string = variant.id || hp.id;

      if (!hiperId) continue;

      // Variação inativa no Hiper
      const variantInactive = variant.variacaoAtiva === false;
      const productInactive = hp.ativo === false;

      try {
        // 1. Localizar produto local por EAN ou SKU
        let product = await prisma.product.findFirst({
          where: { OR: [{ ean: eanHiper }, { sku: eanHiper }] },
          select: { id: true, sku: true, stock: true, imageUrl: true, description: true },
        });

        // 2. Fallback: nome do produto pai
        if (!product) {
          product = await prisma.product.findFirst({
            where: { name: { contains: hp.nome, mode: 'insensitive' } },
            select: { id: true, sku: true, stock: true, imageUrl: true, description: true },
          });
        }

        if (!product) {
          unmatched++;
          continue;
        }

        // Se produto ou variação está inativo no Hiper, desativar localmente
        if (productInactive || variantInactive) {
          await prisma.product.update({
            where: { id: product.id },
            data: { isActive: false },
          });
          deactivated++;
          continue;
        }

        // ── Resolver marca ────────────────────────────────────────────────────
        let brandId: string | undefined;
        const marcaNome: string | undefined = hp.marca || hp.fabricante;
        if (marcaNome) {
          const slug = marcaNome
            .toLowerCase()
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '')
            .replace(/[^a-z0-9\s-]/g, '')
            .trim()
            .replace(/\s+/g, '-');
          const brand = await prisma.brand.upsert({
            where: { slug },
            create: { name: marcaNome.trim(), slug },
            update: {},
            select: { id: true },
          });
          brandId = brand.id;
        }

        // ── Construir dados para update ───────────────────────────────────────
        const updateData: Record<string, any> = {
          externalIdHiper: hiperId,
          isActive: true,
          // EAN: sempre atualizar com o valor do Hiper para garantir match futuro
          ...(eanHiper && { ean: eanHiper }),
          // Marca
          ...(brandId ? { brandId } : {}),
        };

        if (syncMeta) {
          // Imagem: só preenche se o produto local não tiver imagem própria
          const hiperImagem: string | undefined = hp.imagem || variant.imagem;
          if (hiperImagem && !product.imageUrl) {
            updateData.imageUrl = hiperImagem;
          }

          // Descrição: só preenche se o produto local não tiver descrição
          const hiperDescricao: string | undefined = hp.descricao || variant.descricao;
          if (hiperDescricao && (!product.description || product.description.trim() === '')) {
            updateData.description = hiperDescricao;
          }

          // NCM
          if (hp.ncm) updateData.ncm = hp.ncm;

          // Peso (Hiper em kg)
          const peso = variant.peso ?? hp.peso;
          if (peso != null && peso > 0) updateData.weight = Number(peso);

          // Dimensões (Hiper em cm)
          const altura     = variant.altura     ?? hp.altura;
          const largura    = variant.largura    ?? hp.largura;
          const comprimento = variant.comprimento ?? hp.comprimento;
          if (altura || largura || comprimento) {
            updateData.dimensions = {
              height: Number(altura    ?? 0),
              width:  Number(largura   ?? 0),
              length: Number(comprimento ?? 0),
            };
          }
        }

        await prisma.product.update({ where: { id: product.id }, data: updateData });
        matched++;

        // ── Estoque ───────────────────────────────────────────────────────────
        if (syncStock) {
          const stockQty = Math.max(0, Math.floor(
            variant.quantidadeEmEstoque ?? hp.quantidadeEmEstoque ?? 0,
          ));

          const prev = product.stock ?? 0;
          await prisma.product.update({ where: { id: product.id }, data: { stock: stockQty } });
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
    '[HIPER_SYNC] Concluído — matched:%d unmatched:%d stockUpdated:%d deactivated:%d errors:%d nextPoint:%d',
    matched, unmatched, stockUpdated, deactivated, errors, maxSyncPoint,
  );

  return NextResponse.json({
    matched,
    unmatched,
    stockUpdated,
    deactivated,
    errors,
    nextPontoDeSincronizacao: maxSyncPoint,
  });
}
