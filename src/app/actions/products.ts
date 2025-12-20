'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

/**
 * Server Actions para operações de produtos
 * Executadas no servidor com segurança garantida
 */

const ProductActionSchema = z.object({
  name: z.string().min(3),
  sku: z.string().min(1),
  price: z.number().positive(),
  categoryId: z.string(),
  stock: z.number().int().min(0),
  stockLocation: z.string().optional(),
});

export async function createProduct(formData: FormData) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role === 'CUSTOMER') {
      return { success: false, error: 'Não autorizado' };
    }

    const rawData = {
      name: formData.get('name') as string,
      sku: formData.get('sku') as string,
      price: parseFloat(formData.get('price') as string),
      categoryId: formData.get('categoryId') as string,
      stock: parseInt(formData.get('stock') as string),
      stockLocation: formData.get('stockLocation') as string,
    };

    const parsed = ProductActionSchema.safeParse(rawData);

    if (!parsed.success) {
      return { success: false, error: 'Dados inválidos', details: parsed.error };
    }

    const slug = generateSlug(parsed.data.name);

    const product = await prisma.product.create({
      data: {
        ...parsed.data,
        slug,
        isActive: true,
      },
    });

    // Log de atividade
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE_PRODUCT',
        entity: 'Product',
        entityId: product.id,
        changes: { created: product },
      },
    });

    revalidatePath('/admin/products');

    return { success: true, product };
  } catch (error) {
    console.error('[CREATE PRODUCT ERROR]', error);
    return { success: false, error: 'Erro ao criar produto' };
  }
}

export async function updateProductStock(productId: string, newStock: number) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role === 'CUSTOMER') {
      return { success: false, error: 'Não autorizado' };
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return { success: false, error: 'Produto não encontrado' };
    }

    const updated = await prisma.product.update({
      where: { id: productId },
      data: { stock: newStock },
    });

    // Registrar log de estoque
    await prisma.stockLog.create({
      data: {
        productId: product.id,
        source: 'ADMIN',
        previousQty: product.stock,
        newQty: newStock,
        difference: newStock - product.stock,
        reason: `Ajuste manual por ${session.user.name}`,
        userId: session.user.id,
      },
    });

    revalidatePath('/admin/products');

    return { success: true, product: updated };
  } catch (error) {
    console.error('[UPDATE STOCK ERROR]', error);
    return { success: false, error: 'Erro ao atualizar estoque' };
  }
}

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}
