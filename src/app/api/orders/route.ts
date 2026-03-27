import logger from "@/lib/logger";
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getShippingOptions } from "@/lib/shipping-calculator";
import { sendOrderStatusUpdate } from "@/lib/webhooks";
import { notifyOrderStatusChange } from "@/lib/notifications";
import { orderLimiter } from '@/lib/rate-limit';

function formatOrderNumber(seq: number) {
  const year = new Date().getFullYear();
  return `ORD-${year}-${String(seq).padStart(6, "0")}`;
}

export async function POST(req: NextRequest) {
  try {
    // Rate limiting para evitar spam de pedidos
    const blocked = await orderLimiter.check(req);
    if (blocked) return blocked;

    const session = await auth();
    logger.info({
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      userName: session?.user?.name,
    }, '[ORDER_CREATE_SESSION]');

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const {
      items,
      dados,
      entrega,
      paymentMethod,
      shipping: shippingData,
    } = body as {
      items: Array<{ id: string; price: number; quantity: number; name: string; imageUrl?: string }>;
      dados: { nome: string; email: string; telefone: string; cpf: string };
      entrega: { cep: string; endereco: string; numero: string; complemento?: string; bairro: string; cidade: string; estado: string };
      paymentMethod: string;
      shipping?: { serviceId: string; serviceName: string; price: number; deliveryTime: number } | null;
    };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Carrinho vazio" }, { status: 400 });
    }

    // Validar quantidade de cada item
    for (const item of items) {
      if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 100) {
        return NextResponse.json({ error: 'Quantidade inválida' }, { status: 400 });
      }
      if (typeof item.price !== 'number' || item.price <= 0) {
        return NextResponse.json({ error: 'Preço inválido' }, { status: 400 });
      }
    }

    // Validar formato do CEP
    const cepLimpo = (entrega?.cep || '').replace(/\D/g, '');
    if (!/^\d{8}$/.test(cepLimpo)) {
      return NextResponse.json({ error: 'CEP inválido' }, { status: 400 });
    }

    logger.info({ items }, '[ORDER_CREATE_ITEMS]');
    logger.info({ shippingData }, '[ORDER_CREATE_SHIPPING]');

    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // Recalcular frete no servidor usando Melhor Envio para evitar manipulação do cliente
    let shippingCost = 0;
    let selectedShippingServiceId: string | null = null;
    let selectedShippingServiceName: string | null = null;
    try {
      const quoteItems = items.map((it) => ({ productId: it.id, quantity: it.quantity, price: it.price }));
      const options = await getShippingOptions({ items: quoteItems, destinationZip: entrega?.cep || "" });

      logger.info({ options, requestedShipping: shippingData }, "[ORDER_CREATE_ME_OPTIONS]");

      if (!options || options.length === 0) {
        logger.warn({ requestedShipping: shippingData }, "[ORDER_CREATE] Nenhuma opção de frete retornada pelo Melhor Envio");
        return NextResponse.json({ error: "Não foi possível calcular frete via Melhor Envio" }, { status: 400 });
      }

      // Se o cliente enviou um shipping.serviceId, tentamos usar a mesma opção retornada pelo ME
      if (shippingData?.serviceId) {
        const match = options.find((o) => String(o.id) === String(shippingData.serviceId) || (o.service && o.service === shippingData.serviceName));
        logger.info({ requested: shippingData, found: !!match, foundOption: match }, "[ORDER_CREATE_MATCH_ATTEMPT]");
        if (match) {
          shippingCost = match.price;
          selectedShippingServiceId = match.id;
          selectedShippingServiceName = match.service;
          logger.info({ method: "match", shippingCost, selectedShippingServiceId, selectedShippingServiceName }, "[ORDER_CREATE_SELECTED]");
        } else {
          // Cliente pediu uma opção que não bate com a cotação atual; escolher a primeira disponível como fallback
          shippingCost = options[0].price;
          selectedShippingServiceId = options[0].id;
          selectedShippingServiceName = options[0].service;
          logger.info({ reason: "requested_not_found", fallbackOption: options[0], clientShipping: shippingData }, "[ORDER_CREATE_FALLBACK]");
        }
      } else {
        // Cliente não enviou preferência: usar a primeira opção do Melhor Envio
        shippingCost = options[0].price;
        selectedShippingServiceId = options[0].id;
        selectedShippingServiceName = options[0].service;
        logger.info({ method: "default_first", shippingCost, selectedShippingServiceId, selectedShippingServiceName }, "[ORDER_CREATE_SELECTED]");
      }

      // Log de comparação entre preço enviado pelo cliente (se houver) e preço final escolhido
      try {
        const clientPrice = typeof shippingData?.price === "number" ? shippingData.price : null;
        logger.info({ clientPrice, finalPrice: shippingCost, diff: clientPrice !== null ? shippingCost - clientPrice : null }, "[ORDER_CREATE_PRICE_COMPARISON]");
      } catch (e) {
        // ignore
      }
    } catch (err) {
      logger.error(err as Error, "[ORDER_CREATE] Erro ao calcular frete no servidor");
      return NextResponse.json({ error: "Erro ao calcular frete" }, { status: 500 });
    }
    const discount = 0;
    const total = subtotal + shippingCost - discount;

    const shippingAddress = {
      name: dados?.nome,
      email: dados?.email,
      phone: dados?.telefone,
      cpf: dados?.cpf,
      zip: entrega?.cep,
      street: entrega?.endereco,
      number: entrega?.numero,
      complement: entrega?.complemento,
      neighborhood: entrega?.bairro,
      city: entrega?.cidade,
      state: entrega?.estado,
    };

    // Verificar se o usuário existe
    const userExists = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true },
    });

    if (!userExists) {
      logger.error({ userId: session.user.id }, '[ORDER_CREATE] Usuário não encontrado');
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Verificar estoque e preços dentro da transação para evitar race conditions
      const productIds = items.map((item) => item.id);
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true, price: true, promotionalPrice: true, stock: true },
      });

      const productMap = new Map(products.map((p) => [p.id, p]));
      const missingProducts = productIds.filter((id) => !productMap.has(id));

      if (missingProducts.length > 0) {
        throw new Error(`VALIDATION:Alguns produtos não foram encontrados`);
      }

      // Validar estoque e preço de cada item
      for (const item of items) {
        const product = productMap.get(item.id)!;
        if (product.stock < item.quantity) {
          throw new Error(`VALIDATION:Estoque insuficiente para "${product.name}" (disponível: ${product.stock})`);
        }
        // Validar preço no servidor — usar promotionalPrice se existir
        const serverPrice = product.promotionalPrice ?? product.price;
        if (Math.abs(item.price - Number(serverPrice)) > 0.01) {
          logger.warn({ itemId: item.id, clientPrice: item.price, serverPrice: Number(serverPrice) }, '[ORDER_CREATE] Preço divergente detectado');
          throw new Error(`VALIDATION:Preço do produto "${product.name}" foi alterado. Atualize o carrinho.`);
        }
      }

      // Decrementar estoque atomicamente
      for (const item of items) {
        await tx.product.update({
          where: { id: item.id },
          data: { stock: { decrement: item.quantity } },
        });
      }

      const count = await tx.order.count();
      const orderNumber = formatOrderNumber(count + 1);

      const order = await tx.order.create({
        data: {
          orderNumber,
          userId: session.user.id,
          status: "PENDING",
          subtotal,
          discount,
          shipping: shippingCost,
          total,
          paymentMethod: paymentMethod === "boleto" ? "BOLETO" : paymentMethod === "cartao" ? "CREDIT_CARD" : "PIX",
          installments: 1,
          shippingAddress,
          // Dados do Melhor Envio para geração de etiqueta
          shippingServiceId: selectedShippingServiceId,
          melhorEnvioService: selectedShippingServiceName,
          items: {
            create: items.map((item) => ({
              productId: item.id,
              quantity: item.quantity,
              price: item.price,
              discount: 0,
              subtotal: item.price * item.quantity,
            })),
          },
        },
        include: {
          items: {
            include: {
              product: {
                select: { id: true, name: true, sku: true, imageUrl: true },
              },
            },
          },
          user: true,
        },
      });

      return order;
    });

    // Enviar webhook para n8n quando pedido é criado (PENDING)
    await sendOrderStatusUpdate({
      orderId: result.id,
      orderNumber: result.orderNumber,
      status: "PENDING",
      total: result.total,
      user: result.user,
      paymentMethod: result.paymentMethod,
      shippingAddress: result.shippingAddress,
      items: result.items,
    });

    // Criar notificação para o usuário
    await notifyOrderStatusChange({
      userId: result.userId,
      orderId: result.id,
      orderNumber: result.orderNumber,
      status: "PENDING",
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    // Erros de validação de negócio (estoque, preço) retornam 400
    if (error?.message?.startsWith('VALIDATION:')) {
      return NextResponse.json({ error: error.message.replace('VALIDATION:', '') }, { status: 400 });
    }
    logger.error(error as Error, '[ORDER_CREATE]');
    return NextResponse.json({ error: 'Erro ao criar pedido' }, { status: 500 });
  }
}
