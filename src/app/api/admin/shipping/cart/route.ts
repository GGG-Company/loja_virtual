import logger from "@/lib/logger";
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import {
  listMelhorEnvioCart,
  getMelhorEnvioCartItem,
  removeMelhorEnvioCartItem,
  clearMelhorEnvioCart,
} from '@/lib/melhorenvio-shipping';

/**
 * GET /api/admin/shipping/cart
 * Listar itens do carrinho do Melhor Envio
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Verificar se é admin
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true },
    });

    if (!user || (user.role !== 'ADMIN' && user.role !== 'OWNER')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Verificar se quer um item específico
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('itemId');

    if (itemId) {
      // Buscar item específico
      const result = await getMelhorEnvioCartItem(itemId);
      return NextResponse.json(result);
    }

    // Listar todos os itens
    const result = await listMelhorEnvioCart();
    return NextResponse.json(result);

  } catch (error) {
    logger.error(error, '[ADMIN_CART]');
    return NextResponse.json({ error: 'Erro ao consultar carrinho' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/shipping/cart
 * Remover item(s) do carrinho
 * 
 * Query params:
 * - itemId: ID do item para remover um específico
 * - clearAll=true: Para limpar todo o carrinho
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Verificar se é admin
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true },
    });

    if (!user || (user.role !== 'ADMIN' && user.role !== 'OWNER')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('itemId');
    const clearAll = searchParams.get('clearAll') === 'true';

    if (clearAll) {
      // Limpar todo o carrinho
      const result = await clearMelhorEnvioCart();
      return NextResponse.json({
        success: result.success,
        message: result.success 
          ? `Carrinho limpo. ${result.removed} item(s) removido(s).`
          : `Erro ao limpar carrinho. ${result.removed} removido(s), ${result.errors.length} erro(s).`,
        removed: result.removed,
        errors: result.errors,
      });
    }

    if (!itemId) {
      return NextResponse.json({ 
        error: 'Informe itemId para remover um item ou clearAll=true para limpar tudo' 
      }, { status: 400 });
    }

    // Remover item específico
    const result = await removeMelhorEnvioCartItem(itemId);
    return NextResponse.json({
      success: result.success,
      message: result.success ? 'Item removido com sucesso' : result.error,
    });

  } catch (error) {
    logger.error(error, '[ADMIN_CART]');
    return NextResponse.json({ error: 'Erro ao remover do carrinho' }, { status: 500 });
  }
}
