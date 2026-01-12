import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...\n');

  // ============================================
  // 1. CRIAR USUÁRIOS REAIS
  // ============================================
  console.log('👤 Criando usuários...');

  const hashedPassword = await bcrypt.hash('senha123', 10);

  const owner = await prisma.user.upsert({
    where: { email: 'dono@loja.com' },
    update: {},
    create: {
      name: 'Carlos Silva',
      email: 'dono@loja.com',
      password: hashedPassword,
      phone: '(71) 99999-0001',
      role: 'OWNER',
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: 'gerente@loja.com' },
    update: {},
    create: {
      name: 'Ana Paula Santos',
      email: 'gerente@loja.com',
      password: hashedPassword,
      phone: '(71) 99999-0002',
      role: 'ADMIN',
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: 'cliente@gmail.com' },
    update: {},
    create: {
      name: 'João Pereira',
      email: 'cliente@gmail.com',
      password: hashedPassword,
      phone: '(71) 99999-0003',
      role: 'CUSTOMER',
    },
  });

  console.log(`✅ ${owner.name} (OWNER)`);
  console.log(`✅ ${admin.name} (ADMIN)`);
  console.log(`✅ ${customer.name} (CUSTOMER)\n`);

  // ============================================
  // 2. CRIAR CATEGORIAS
  // ============================================
  console.log('📁 Criando categorias...');

  const categoryFuradeiras = await prisma.category.upsert({
    where: { slug: 'furadeiras' },
    update: {
      name: 'Furadeiras',
      description: 'Furadeiras e Parafusadeiras profissionais',
      image: '/categories/furadeiras.jpg',
    },
    create: {
      name: 'Furadeiras',
      slug: 'furadeiras',
      description: 'Furadeiras e Parafusadeiras profissionais',
      image: '/categories/furadeiras.jpg',
    },
  });

  const categorySerras = await prisma.category.upsert({
    where: { slug: 'serras' },
    update: {
      name: 'Serras',
      description: 'Serras elétricas e manuais',
      image: '/categories/serras.jpg',
    },
    create: {
      name: 'Serras',
      slug: 'serras',
      description: 'Serras elétricas e manuais',
      image: '/categories/serras.jpg',
    },
  });

  const categoryEsmerilhadeiras = await prisma.category.upsert({
    where: { slug: 'esmerilhadeiras' },
    update: {
      name: 'Esmerilhadeiras',
      description: 'Esmerilhadeiras angulares e retas',
      image: '/categories/esmerilhadeiras.jpg',
    },
    create: {
      name: 'Esmerilhadeiras',
      slug: 'esmerilhadeiras',
      description: 'Esmerilhadeiras angulares e retas',
      image: '/categories/esmerilhadeiras.jpg',
    },
  });

  const categoryPlainas = await prisma.category.upsert({
    where: { slug: 'plainas-e-lixadeiras' },
    update: {
      name: 'Plainas e Lixadeiras',
      description: 'Ferramentas de desbaste e acabamento',
      image: '/categories/plainas.jpg',
    },
    create: {
      name: 'Plainas e Lixadeiras',
      slug: 'plainas-e-lixadeiras',
      description: 'Ferramentas de desbaste e acabamento',
      image: '/categories/plainas.jpg',
    },
  });

  console.log(`✅ Categorias criadas\n`);

  // ============================================
  // 3. CRIAR PRODUTOS REAIS (BOSCH, MAKITA)
  // ============================================
  console.log('🛠️  Criando produtos...');

  const products = [
    // MAKITA
    {
      sku: 'MAKITA-DHR243Z',
      ean: '7896011234567',
      slug: 'martelete-rotativo-makita-dhr243z',
      name: 'Martelete Rotativo à Bateria Makita DHR243Z 18V',
      description:
        'Martelete perfurador e rompedor com tecnologia brushless. Alta performance para concreto e alvenaria. Sistema anti-vibração AVT.',
      shortDescription: 'Martelete 18V Brushless com 3 modos de operação',
      price: 1899.0,
      compareAtPrice: 2299.0,
      cost: 1200.0,
      stock: 15,
      stockLocation: 'Corredor A - Prateleira 2',
      categoryId: categoryFuradeiras.id,
      imageUrl: '/products/martelete-rotativo-makita-dhr243z-1.jpg',
      specs: {
        voltagem: '18V',
        potencia: '1200W',
        peso: '3.4kg',
        rotacoes: '0-1100 rpm',
        marca: 'Makita',
      },
      isFeatured: true,
      isActive: true,
      externalIdML: 'MLB123456789',
    },
    {
      sku: 'MAKITA-DDF483Z',
      ean: '7896011234568',
      slug: 'parafusadeira-furadeira-makita-ddf483z',
      name: 'Parafusadeira/Furadeira de Impacto Makita DDF483Z 18V',
      description:
        'Parafusadeira com função impacto. Motor brushless de alta eficiência. 2 velocidades mecânicas. Mandril auto-travante 13mm.',
      shortDescription: 'Parafusadeira 18V Brushless com 2 velocidades',
      price: 899.0,
      stock: 28,
      stockLocation: 'Corredor A - Prateleira 3',
      categoryId: categoryFuradeiras.id,
      imageUrl: '/products/parafusadeira-furadeira-makita-ddf483z-1.jpg',
      specs: {
        voltagem: '18V',
        torque: '140 Nm',
        peso: '1.8kg',
        marca: 'Makita',
      },
      isFeatured: true,
      isActive: true,
    },
    {
      sku: 'MAKITA-5007N',
      ean: '7896011234572',
      slug: 'serra-circular-makita-5007n',
      name: 'Serra Circular Makita 5007N 7.1/4" 1800W',
      description:
        'Serra circular profissional com alta potência e durabilidade. Base de alumínio e ajuste de profundidade de corte.',
      shortDescription: 'Serra Circular 1800W 7.1/4" Profissional',
      price: 749.0,
      stock: 10,
      stockLocation: 'Corredor C - Prateleira 1',
      categoryId: categorySerras.id,
      imageUrl: '/products/serra-circular-makita-5007n-1.jpg',
      specs: {
        potencia: '1800W',
        disco: '7.1/4"',
        marca: 'Makita',
      },
      isFeatured: true,
      isActive: true,
    },
    // BOSCH
    {
      sku: 'BOSCH-GSB-180-LI',
      ean: '7896011234569',
      slug: 'parafusadeira-furadeira-bosch-gsb-180-li',
      name: 'Parafusadeira/Furadeira Bosch GSB 180-LI 18V Profissional',
      description:
        'Ferramenta profissional Bosch com luz LED integrada. 2 velocidades. Mandril automático. Bateria de Lítio de longa duração.',
      shortDescription: 'Parafusadeira Bosch 18V Profissional com LED',
      price: 1199.0,
      compareAtPrice: 1499.0,
      cost: 750.0,
      stock: 20,
      stockLocation: 'Corredor A - Prateleira 4',
      categoryId: categoryFuradeiras.id,
      imageUrl: '/products/parafusadeira-furadeira-bosch-gsb-180-li-1.jpg',
      specs: {
        voltagem: '18V',
        torque: '63 Nm',
        peso: '1.5kg',
        marca: 'Bosch',
      },
      isFeatured: false,
      isActive: true,
      externalIdHiper: 'HIP987654',
    },
    {
      sku: 'BOSCH-GWS-850',
      ean: '7896011234570',
      slug: 'esmerilhadeira-angular-bosch-gws-850',
      name: 'Esmerilhadeira Angular Bosch GWS 850 4.1/2" 850W',
      description:
        'Esmerilhadeira compacta e potente. Motor de 850W. Protetor de disco ajustável sem ferramenta. Empunhadura lateral com 3 posições.',
      shortDescription: 'Esmerilhadeira 850W 4.1/2" com proteção ajustável',
      price: 389.0,
      stock: 45,
      stockLocation: 'Corredor B - Prateleira 1',
      categoryId: categoryEsmerilhadeiras.id,
      imageUrl: '/products/esmerilhadeira-angular-bosch-gws-850-1.jpg',
      specs: {
        voltagem: '220V',
        potencia: '850W',
        disco: '4.1/2 polegadas',
        peso: '1.8kg',
        marca: 'Bosch',
      },
      isFeatured: false,
      isActive: true,
    },
    {
      sku: 'BOSCH-GST-75-E',
      ean: '7896011234573',
      slug: 'serra-tico-tico-bosch-gst-75-e',
      name: 'Serra Tico-Tico Bosch GST 75 E 710W',
      description:
        'Serra tico-tico com sistema de troca de lâmina sem ferramentas. Alta precisão e controle. Motor de 710W para cortes rápidos.',
      shortDescription: 'Serra Tico-Tico 710W Bosch Profissional',
      price: 599.0,
      stock: 18,
      stockLocation: 'Corredor C - Prateleira 2',
      categoryId: categorySerras.id,
      imageUrl: '/products/serra-tico-tico-bosch-gst-75-e-1.jpg',
      specs: {
        potencia: '710W',
        marca: 'Bosch',
      },
      isFeatured: false,
      isActive: true,
    },
    // DEWALT
    {
      sku: 'DEWALT-DCD996B',
      ean: '7896011234571',
      slug: 'furadeira-impacto-dewalt-dcd996b',
      name: 'Furadeira de Impacto DeWalt DCD996B 20V MAX Brushless',
      description:
        'Motor brushless de alta eficiência. 3 velocidades. Aplicação profissional em concreto, madeira e metal. Sistema XR de alta performance.',
      shortDescription: 'Furadeira DeWalt 20V Brushless 3 velocidades',
      price: 1549.0,
      compareAtPrice: 1899.0,
      cost: 980.0,
      stock: 12,
      stockLocation: 'Corredor A - Prateleira 5',
      categoryId: categoryFuradeiras.id,
      imageUrl: '/products/furadeira-impacto-dewalt-dcd996b-1.jpg',
      specs: {
        voltagem: '20V',
        torque: '142 Nm',
        peso: '2.0kg',
        marca: 'DeWalt',
      },
      isFeatured: true,
      isActive: true,
    },
    {
      sku: 'DEWALT-DWE4010',
      ean: '7896011234574',
      slug: 'esmerilhadeira-dewalt-dwe4010',
      name: 'Esmerilhadeira Angular DeWalt DWE4010 4.1/2" 700W',
      description:
        'Esmerilhadeira resistente e ergonômica. Engrenagens helicoidais para maior durabilidade. Sistema de ventilação avançado.',
      shortDescription: 'Esmerilhadeira DeWalt 700W 4.1/2"',
      price: 349.0,
      stock: 30,
      stockLocation: 'Corredor B - Prateleira 2',
      categoryId: categoryEsmerilhadeiras.id,
      imageUrl: '/products/esmerilhadeira-dewalt-dwe4010-1.jpg',
      specs: {
        potencia: '700W',
        disco: '4.1/2"',
        marca: 'DeWalt',
      },
      isFeatured: false,
      isActive: true,
    },
    {
      sku: 'BOSCH-GHO-700',
      ean: '7896011234575',
      slug: 'plaina-eletrica-bosch-gho-700',
      name: 'Plaina Elétrica Bosch GHO 700 700W',
      description:
        'Plaina elétrica para acabamentos perfeitos em madeira. Ajuste de profundidade preciso e saída de cavacos otimizada.',
      shortDescription: 'Plaina Bosch 700W Profissional',
      price: 689.0,
      stock: 8,
      stockLocation: 'Corredor D - Prateleira 1',
      categoryId: categoryPlainas.id,
      imageUrl: '/products/plaina-eletrica-bosch-gho-700-1.jpg',
      specs: {
        potencia: '700W',
        marca: 'Bosch',
      },
      isFeatured: true,
      isActive: true,
    },
  ];

  for (const productData of products) {
    const { sku, ...rest } = productData;

    const product = await prisma.product.upsert({
      where: { sku },
      update: rest,
      create: productData,
    });

    // Substitui imagens para manter seed idempotente
    await prisma.productImage.deleteMany({ where: { productId: product.id } });
    await prisma.productImage.createMany({
      data: [
        {
          productId: product.id,
          url: `/products/${product.slug}-1.jpg`,
          alt: `${product.name} - Imagem principal`,
          order: 0,
        },
        {
          productId: product.id,
          url: `/products/${product.slug}-2.jpg`,
          alt: `${product.name} - Detalhe`,
          order: 1,
        },
      ],
    });

    console.log(`✅ ${product.name}`);
  }

  console.log('');

  // ============================================
  // 4. CRIAR VARIANTES (110V/220V)
  // ============================================
  console.log('⚡ Criando variantes de voltagem...');

  const makitaDHR = await prisma.product.findUnique({
    where: { sku: 'MAKITA-DHR243Z' },
  });

  if (makitaDHR) {
    await prisma.productVariant.deleteMany({ where: { productId: makitaDHR.id } });
    await prisma.productVariant.createMany({
      data: [
        {
          productId: makitaDHR.id,
          sku: 'MAKITA-DHR243Z-110V',
          name: '110V',
          stock: 8,
          attributes: { voltagem: '110V' },
        },
        {
          productId: makitaDHR.id,
          sku: 'MAKITA-DHR243Z-220V',
          name: '220V',
          stock: 7,
          attributes: { voltagem: '220V' },
        },
      ],
    });
    console.log('✅ Variantes Makita DHR243Z criadas');
  }

  console.log('');

  // ============================================
  // 5. CRIAR CUPONS
  // ============================================
  console.log('🎟️  Criando cupons...');

  const coupons = [
    {
      code: 'BEMVINDO10',
      description: 'Desconto de 10% para primeira compra',
      discountType: 'PERCENTAGE',
      value: 10,
      scope: 'GLOBAL',
      minPurchase: 100,
      maxDiscount: 50,
      isActive: true,
      startDate: new Date(),
      endDate: new Date('2025-12-31'),
    },
    {
      code: 'BAHIA50',
      description: 'R$ 50 de desconto para clientes da Bahia',
      discountType: 'FIXED',
      value: 50,
      scope: 'STATE',
      scopeValues: ['BA'],
      minPurchase: 200,
      isActive: true,
    },
  ];

  for (const coupon of coupons) {
    await prisma.coupon.upsert({
      where: { code: coupon.code },
      update: coupon as any,
      create: coupon as any,
    });
    console.log(`✅ Cupom ${coupon.code}`);
  }

  console.log('');

  // ============================================
  // 6. CRIAR BANNERS
  // ============================================
  console.log('🎨 Criando banners...');

  const banners = [
    {
      title: 'Black Friday Ferramentas',
      imageUrl: '/banners/blackfriday.jpg',
      link: '/promocoes/blackfriday',
      order: 0,
      isActive: true,
    },
    {
      title: 'Lançamento Makita 2025',
      imageUrl: '/banners/makita-lancamento.jpg',
      link: '/categorias/furadeiras',
      order: 1,
      isActive: true,
    },
  ];

  // Remove banners com mesmo título antes de recriar
  await prisma.banner.deleteMany({ where: { title: { in: banners.map((b) => b.title) } } });
  await prisma.banner.createMany({ data: banners });

  console.log('✅ Banners criados\n');

  // ============================================
  // 7. CRIAR FINANCIAL CONFIG (SINGLETON)
  // ============================================
  console.log('💰 Criando configuração financeira...');

  await prisma.financialConfig.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      creditCardInterestRate: 1.99,
      debitCardInterestRate: 0,
      maxInstallments: 12,
      minInstallmentValue: 50,
      freeShippingMinValue: 200,
      defaultMarkupPercentage: 30,
    },
  });

  console.log('✅ Configuração financeira criada\n');

  // ============================================
  // 8. CRIAR PEDIDO DE EXEMPLO
  // ============================================
  console.log('📦 Criando pedido de exemplo...');

  const exampleProduct = await prisma.product.findFirst({
    where: { sku: 'MAKITA-DDF483Z' },
  });

  if (exampleProduct) {
    const orderNumber = 'ORD-2025-000001';

    const order = await prisma.order.upsert({
      where: { orderNumber },
      update: {
        userId: customer.id,
        status: 'CONFIRMED',
        subtotal: 899,
        shipping: 25,
        total: 924,
        paymentMethod: 'CREDIT_CARD',
        installments: 3,
        paidAt: new Date(),
        shippingAddress: {
          street: 'Rua das Ferramentas',
          number: '123',
          neighborhood: 'Centro',
          city: 'Salvador',
          state: 'BA',
          zipCode: '40000-000',
        },
      },
      create: {
        orderNumber,
        userId: customer.id,
        status: 'CONFIRMED',
        subtotal: 899,
        shipping: 25,
        total: 924,
        paymentMethod: 'CREDIT_CARD',
        installments: 3,
        paidAt: new Date(),
        shippingAddress: {
          street: 'Rua das Ferramentas',
          number: '123',
          neighborhood: 'Centro',
          city: 'Salvador',
          state: 'BA',
          zipCode: '40000-000',
        },
      },
    });

    // Recria itens do pedido para manter seed consistente
    await prisma.orderItem.deleteMany({ where: { orderId: order.id } });
    await prisma.orderItem.create({
      data: {
        orderId: order.id,
        productId: exampleProduct.id,
        quantity: 1,
        price: exampleProduct.price,
        subtotal: exampleProduct.price,
      },
    });

    console.log(`✅ Pedido ${order.orderNumber} criado`);
  }

  console.log('');

  // ============================================
  // 9. CRIAR AVALIAÇÕES (REVIEWS)
  // ============================================
  console.log('⭐️ Criando avaliações...');

  const allProducts = await prisma.product.findMany();
  
  for (const product of allProducts) {
    await prisma.review.upsert({
      where: {
        productId_userId: {
          productId: product.id,
          userId: customer.id,
        },
      },
      update: {},
      create: {
        productId: product.id,
        userId: customer.id,
        rating: 5,
        title: 'Excelente produto!',
        comment: 'Superou minhas expectativas, entrega rápida e material de qualidade.',
        isVerifiedPurchase: true,
        isApproved: true,
      },
    });
  }
  console.log('✅ Avaliações criadas');

  console.log('');

  // ============================================
  // 10. CRIAR DEVOLUÇÃO (RETURNS)
  // ============================================
  console.log('🔄 Criando devolução de exemplo...');

  const orderForReturn = await prisma.order.findUnique({
    where: { orderNumber: 'ORD-2025-000001' },
    include: { items: true },
  });

  if (orderForReturn && orderForReturn.items.length > 0) {
    const returnNumber = 'DEV-2026-000001';
    const firstItem = orderForReturn.items[0];

    const returnRequest = await prisma.return.upsert({
      where: { returnNumber },
      update: {},
      create: {
        returnNumber,
        orderId: orderForReturn.id,
        userId: customer.id,
        status: 'PENDING_REVIEW',
        reason: 'DEFECTIVE',
        reasonDetails: 'O motor apresentou um ruído estranho no primeiro uso.',
        refundAmount: firstItem.price,
        items: {
          create: {
            productId: firstItem.productId,
            orderItemId: firstItem.id,
            quantity: 1,
            reason: 'Defeito de fábrica',
          },
        },
      },
    });
    console.log(`✅ Devolução ${returnRequest.returnNumber} criada`);
  }

  console.log('');

  // ============================================
  // 11. CRIAR NOTIFICAÇÕES
  // ============================================
  console.log('🔔 Criando notificações...');

  const notifications = [
    {
      userId: customer.id,
      type: 'ORDER_STATUS' as const,
      title: 'Pedido Confirmado',
      message: 'Seu pedido ORD-2025-000001 foi confirmado e está em processamento.',
      isRead: true,
    },
    {
      userId: customer.id,
      type: 'RETURN_STATUS' as const,
      title: 'Solicitação de Devolução Recebida',
      message: 'Recebemos seu pedido de devolução DEV-2026-000001 e estamos analisando.',
      isRead: false,
    },
  ];

  for (const notification of notifications) {
    await prisma.notification.create({
      data: notification,
    });
  }
  console.log('✅ Notificações criadas');

  console.log('');

  // ============================================
  // 12. CONFIGURAÇÕES DE INTEGRAÇÃO
  // ============================================
  console.log('🔌 Inicializando configurações de integração...');

  await prisma.melhorEnvioToken.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      environment: 'sandbox',
    },
  });

  await prisma.mercadoPagoConfig.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      environment: 'sandbox',
      active: false,
    },
  });

  console.log('✅ Configurações de integração inicializadas');

  console.log('');

  // ============================================
  // 13. CRIAR REGRAS DE FRETE (SHIPPING RULES)
  // ============================================
  console.log('🚚 Criando regras de frete...');

  const shippingRules = [
    {
      name: 'Frete Grátis Brasil (Acima de R$ 500)',
      type: 'ALL' as const,
      isFree: true,
      minValue: 500,
      priority: 1,
      active: true,
    },
    {
      name: 'Frete Fixo Nordeste',
      type: 'STATE' as const,
      states: ['BA', 'PE', 'CE', 'AL', 'SE', 'MA', 'PI', 'PB', 'RN'],
      isFree: false,
      price: 29.90,
      priority: 10,
      active: true,
    },
  ];

  for (const rule of shippingRules) {
    await prisma.shippingRule.create({
      data: rule,
    });
  }

  console.log('✅ Regras de frete criadas');

  console.log('');
  console.log('✅ Seed concluído com sucesso! 🎉\n');
  console.log('📋 Resumo:');
  console.log('   - 3 usuários (Owner, Admin, Customer)');
  console.log('   - 4 categorias (Furadeiras, Serras, Esmerilhadeiras, Plainas)');
  console.log('   - 9 produtos reais (Makita, Bosch, DeWalt)');
  console.log('   - 2 variantes de voltagem');
  console.log('   - 2 cupons');
  console.log('   - 2 banners');
  console.log('   - 1 configuração financeira');
  console.log('   - 1 pedido de exemplo');
  console.log('   - Avaliações em todos os produtos');
  console.log('   - 1 solicitação de devolução');
  console.log('   - 2 notificações de exemplo');
  console.log('   - 2 regras de frete (Nacional e Regional)');
  console.log('   - Configurações de integração (Singleton)\n');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
