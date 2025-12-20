import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
        (sum, item) => sum + item.product.price * item.quantity,
        0
      );

      return {
        cartId: cart.id,
        user: cart.user,
        items: cart.items.map((item) => ({
          productName: item.product.name,
          quantity: item.quantity,
          price: item.product.price,
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
    console.error('[ABANDONED CARTS ERROR]', error);
    return NextResponse.json(
      { error: 'Erro ao buscar carrinhos abandonados' },
      { status: 500 }
    );
  }
}
