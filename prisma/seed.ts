import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import bcrypt from 'bcryptjs';

const dbUrl = process.env.DATABASE_URL || 'file:./dev.db';
const adapter = new PrismaLibSql({ url: dbUrl });
const prisma = new PrismaClient({ adapter });

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

  const categoryFuradeiras = await prisma.category.create({
    data: {
      name: 'Furadeiras',
      slug: 'furadeiras',
      description: 'Furadeiras e Parafusadeiras profissionais',
      image: '/categories/furadeiras.jpg',
    },
  });

  const categorySerras = await prisma.category.create({
    data: {
      name: 'Serras',
      slug: 'serras',
      description: 'Serras elétricas e manuais',
      image: '/categories/serras.jpg',
    },
  });

  const categoryEsmerilhadeiras = await prisma.category.create({
    data: {
      name: 'Esmerilhadeiras',
      slug: 'esmerilhadeiras',
      description: 'Esmerilhadeiras angulares e retas',
      image: '/categories/esmerilhadeiras.jpg',
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
      specs: {
        voltagem: '18V',
        torque: '140 Nm',
        peso: '1.8kg',
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
      specs: {
        voltagem: '20V',
        torque: '142 Nm',
        peso: '2.0kg',
        marca: 'DeWalt',
      },
      isFeatured: true,
      isActive: true,
    },
  ];

  for (const productData of products) {
    const product = await prisma.product.create({
      data: productData,
    });

    // Criar imagens fictícias
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

  await prisma.coupon.createMany({
    data: [
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
    ],
  });

  console.log('✅ Cupons criados\n');

  // ============================================
  // 6. CRIAR BANNERS
  // ============================================
  console.log('🎨 Criando banners...');

  await prisma.banner.createMany({
    data: [
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
    ],
  });

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
    const order = await prisma.order.create({
      data: {
        orderNumber: 'ORD-2025-000001',
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
  console.log('✅ Seed concluído com sucesso! 🎉\n');
  console.log('📋 Resumo:');
  console.log('   - 3 usuários (Owner, Admin, Customer)');
  console.log('   - 3 categorias');
  console.log('   - 5 produtos reais (Makita, Bosch, DeWalt)');
  console.log('   - 2 variantes de voltagem');
  console.log('   - 2 cupons');
  console.log('   - 2 banners');
  console.log('   - 1 configuração financeira');
  console.log('   - 1 pedido de exemplo\n');
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
