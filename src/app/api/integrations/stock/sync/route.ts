import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

// Schema de validação
const StockSyncSchema = z.object({
  sku: z.string().min(1, 'SKU é obrigatório'),
  quantity: z.number().int().min(0, 'Quantidade deve ser positiva'),
  source: z.enum(['MERCADO_LIVRE', 'HIPER', 'ADMIN', 'PHYSICAL_STORE']),
  reason: z.string().optional(),
});

/**
 * POST /api/integrations/stock/sync
 * 
 * Endpoint de ENTRADA (Inbound) para sincronização de estoque.
 * Workers externos (Zapier, n8n, scripts ML/Hiper) podem atualizar estoque via esta API.
 * 
 * Headers obrigatórios:
 *   X-INTERNAL-API-KEY: chave configurada no .env
 * 
 * Body:
 * {
 *   "sku": "MAKITA-DHR243Z",
 *   "quantity": 50,
 *   "source": "MERCADO_LIVRE",
 *   "reason": "Venda ML #MLB123456"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    
    // Validação com Zod
    const parsed = StockSyncSchema.safeParse(body);
    
    if (!parsed.success) {
      await logIntegration(request, body, 400, false, parsed.error.message);
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { sku, quantity, source, reason } = parsed.data;

    // Buscar produto
    const product = await prisma.product.findUnique({
      where: { sku },
    });

    if (!product) {
      await logIntegration(request, body, 404, false, 'Produto não encontrado');
      return NextResponse.json(
        { error: `Produto com SKU ${sku} não encontrado` },
        { status: 404 }
      );
    }

    const previousQty = product.stock;

    // Atualizar estoque
    const updated = await prisma.product.update({
      where: { sku },
      data: { stock: quantity },
    });

    // Registrar log de estoque
    await prisma.stockLog.create({
      data: {
        productId: product.id,
        source,
        previousQty,
        newQty: quantity,
        difference: quantity - previousQty,
        reason: reason || `Sincronização ${source}`,
      },
    });

    await logIntegration(request, body, 200, true);

    return NextResponse.json({
      success: true,
      product: {
        id: updated.id,
        sku: updated.sku,
        name: updated.name,
        previousStock: previousQty,
        newStock: updated.stock,
        difference: updated.stock - previousQty,
      },
    });
  } catch (error) {
    console.error('[STOCK SYNC ERROR]', error);
    
    await logIntegration(
      request,
      {},
      500,
      false,
      error instanceof Error ? error.message : 'Erro desconhecido'
    );

    return NextResponse.json(
      { error: 'Erro interno ao sincronizar estoque' },
      { status: 500 }
    );
  }
}

// Helper: registrar log de integração
async function logIntegration(
  request: NextRequest,
  requestBody: unknown,
  statusCode: number,
  success: boolean,
  errorMessage?: string
) {
  const source =
    typeof requestBody === 'object' && requestBody !== null && 'source' in requestBody &&
    typeof (requestBody as { source?: unknown }).source === 'string'
      ? (requestBody as { source: string }).source
      : 'UNKNOWN';

  await prisma.integrationLog.create({
    data: {
      endpoint: '/api/integrations/stock/sync',
      method: 'POST',
      source,
      requestBody: requestBody as Prisma.InputJsonValue,
      statusCode,
      success,
      errorMessage,
    },
  });
}
