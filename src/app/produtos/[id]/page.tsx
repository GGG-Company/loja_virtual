/**
 * Server Component — entry point da rota /produtos/[id]
 *
 * Responsabilidades:
 *   - ISR: revalida o cache a cada 1 hora (revalidate = 3600)
 *   - generateMetadata: SEO/OG dinâmico sem chamada extra no client
 *   - Renderiza o componente client que faz a interatividade
 */

import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { ProductDetailPage } from './_client';

export const revalidate = 3600; // revalida o HTML a cada 1 hora

// Pré-gera as 50 páginas de produto mais recentes no build — demais são ISR on-demand
export async function generateStaticParams() {
  const products = await prisma.product
    .findMany({
      where: { isActive: true },
      select: { id: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    .catch(() => []);
  return products.map((p) => ({ id: p.id }));
}

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id },
    select: {
      name: true,
      shortDescription: true,
      description: true,
      imageUrl: true,
      images: { select: { url: true } },
      price: true,
      promotionalPrice: true,
      sku: true,
      ean: true,
      stock: true,
      category: { select: { name: true } },
    },
  }).catch(() => null);

  if (!product) {
    return { title: 'Produto não encontrado | Feira das Ferramentas' };
  }

  const price = Number(product.promotionalPrice ?? product.price);
  const description =
    product.shortDescription ||
    (product.description ? product.description.slice(0, 160) : undefined) ||
    `Compre ${product.name} com o melhor preço na Feira das Ferramentas.`;

  return {
    title: `${product.name} | Feira das Ferramentas`,
    description,
    openGraph: {
      title: product.name,
      description,
      images: product.imageUrl ? [{ url: product.imageUrl }] : [],
      type: 'website',
    },
    other: {
      'product:price:amount': String(price),
      'product:price:currency': 'BRL',
    },
  };
}

export default async function Page({ params }: Props) {
  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id },
    select: {
      name: true,
      description: true,
      imageUrl: true,
      images: { select: { url: true } },
      price: true,
      promotionalPrice: true,
      sku: true,
      ean: true,
      stock: true,
      category: { select: { name: true } },
    },
  }).catch(() => null);

  const jsonLd = product
    ? JSON.stringify({
        '@context': 'https://schema.org/',
        '@type': 'Product',
        name: product.name,
        image: [product.imageUrl, ...(product.images?.map((i) => i.url) ?? [])].filter(Boolean),
        description: product.description ?? undefined,
        sku: product.sku ?? undefined,
        gtin13: product.ean ?? undefined,
        brand: { '@type': 'Brand', name: 'Feira das Ferramentas' },
        category: product.category?.name ?? undefined,
        offers: {
          '@type': 'Offer',
          priceCurrency: 'BRL',
          price: Number(product.promotionalPrice ?? product.price).toFixed(2),
          availability:
            (product.stock ?? 0) > 0
              ? 'https://schema.org/InStock'
              : 'https://schema.org/OutOfStock',
          seller: { '@type': 'Organization', name: 'Feira das Ferramentas' },
        },
      }).replace(/</g, '\\u003c')
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd }}
        />
      )}
      <ProductDetailPage />
    </>
  );
}
