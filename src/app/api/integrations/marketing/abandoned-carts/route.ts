import logger from "@/lib/logger";
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toNum } from '@/lib/decimal-helpers';
import { sendAbandonedCartEmail } from '@/lib/mailer';

export const dynamic = 'force-dynamic';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://feiradeferramentas.com.br';

/**
 * GET /api/integrations/marketing/abandoned-carts
 * 
 * Endpoint de SAÍDA (Outbound) para leitura de carrinhos abandonados.
 * Bot de WhatsApp externo pode consumir esta API para enviar lembretes.
 * 
 * Query params:
 *   - hours: número de horas de abandono (padrão: 24)
 * 
 * Retorna lista de carrinhos com usuário e produtos.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const hoursAgo = parseInt(searchParams.get('hours') || '24', 10);

    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - hoursAgo);

    // Carrinhos abandonados (não convertidos em pedido)
    const abandonedCarts = await prisma.cart.findMany({
      where: {
        updatedAt: {
          lte: cutoffDate,
        },
        userId: {
          not: null,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                price: true,
                images: {
                  take: 1,
                  orderBy: { order: 'asc' },
                },
              },
            },
          },
        },
      },
      take: 50, // Limite para não sobrecarregar
    });

    // Calcular valor total de cada carrinho
    const enrichedCarts = abandonedCarts.map((cart) => {
      const total = cart.items.reduce(
        (sum, item) => sum + toNum(item.product.price) * item.quantity,
        0
      );

      return {
        cartId: cart.id,
        user: cart.user,
        items: cart.items.map((item) => ({
          productName: item.product.name,
          quantity: item.quantity,
          price: toNum(item.product.price),
          image: item.product.images[0]?.url,
        })),
        total,
        abandonedAt: cart.updatedAt,
      };
    });

    // Log da integração
    await prisma.integrationLog.create({
      data: {
        endpoint: '/api/integrations/marketing/abandoned-carts',
        method: 'GET',
        source: 'WhatsApp Bot',
        statusCode: 200,
        success: true,
      },
    });

    return NextResponse.json({
      success: true,
      count: enrichedCarts.length,
      carts: enrichedCarts,
    });
  } catch (error) {
    logger.error(error instanceof Error ? error : new Error(String(error)), '[ABANDONED CARTS ERROR]');
    return NextResponse.json(
      { error: 'Erro ao buscar carrinhos abandonados' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/integrations/marketing/abandoned-carts
 *
 * Dispara e-mails de recuperação para carrinhos abandonados.
 * Protegido por CRON_SECRET. Pode ser chamado por um scheduler externo
 * (n8n, Vercel Cron, etc.) para envio em lote, ou com `cartId` específico.
 *
 * Body (opcional): { cartId?: string; hours?: number }
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const body = await request.json().catch(() => ({}));
    const hoursAgo = Number(body?.hours ?? 24);
    const specificCartId: string | undefined = body?.cartId;

    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - hoursAgo);

    const carts = await prisma.cart.findMany({
      where: {
        ...(specificCartId ? { id: specificCartId } : { updatedAt: { lte: cutoffDate } }),
        userId: { not: null },
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        items: {
          include: {
            product: {
              select: {
                id: true, name: true, price: true,
                images: { take: 1, orderBy: { order: 'asc' } },
              },
            },
          },
        },
      },
      take: specificCartId ? 1 : 50,
    });

    let sent = 0;
    let failed = 0;

    for (const cart of carts) {
      if (!cart.user?.email || !cart.user?.name) continue;

      const items = cart.items.map((item) => ({
        name: item.product.name,
        quantity: item.quantity,
        price: toNum(item.product.price),
        imageUrl: item.product.images[0]?.url,
      }));

      const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
      if (total === 0) continue;

      const result = await sendAbandonedCartEmail(cart.user.email, {
        userName: cart.user.name,
        items,
        total,
        cartUrl: `${APP_URL}/carrinho`,
      });

      if (result.ok) {
        sent++;
        logger.info({ cartId: cart.id, email: cart.user.email }, '[ABANDONED CARTS] E-mail enviado');
      } else {
        failed++;
        logger.warn({ cartId: cart.id, reason: result.reason }, '[ABANDONED CARTS] Falha ao enviar e-mail');
      }
    }

    await prisma.integrationLog.create({
      data: {
        endpoint: '/api/integrations/marketing/abandoned-carts',
        method: 'POST',
        source: 'Email Trigger',
        statusCode: 200,
        success: true,
      },
    });

    return NextResponse.json({ success: true, sent, failed, total: carts.length });
  } catch (error) {
    logger.error(error instanceof Error ? error : new Error(String(error)), '[ABANDONED CARTS EMAIL ERROR]');
    return NextResponse.json({ error: 'Erro ao disparar e-mails' }, { status: 500 });
  }
}
