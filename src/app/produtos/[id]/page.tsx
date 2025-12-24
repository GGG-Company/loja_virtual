'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ShoppingCart, Truck, Shield, CreditCard, Heart } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { usePrice } from '@/hooks/use-price';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import Script from 'next/script';

type ProductVariant = {
  id: string;
  name: string;
};

type ProductDetail = {
  id: string;
  sku?: string | null;
  ean?: string | null;
  slug?: string;
  name: string;
  description?: string | null;
  price: number;
  promotionalPrice?: number | null;
  compareAtPrice?: number | null;
  imageUrl?: string | null;
  images?: { url: string; alt?: string | null }[];
  category?: {
    name?: string;
  };
  variants?: ProductVariant[];
  stock?: number;
  weight?: number | null;
  dimensions?: Record<string, unknown> | null;
  ncm?: string | null;
  origin?: string | null;
  specs?: Record<string, unknown>;
};

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVoltage, setSelectedVoltage] = useState('');
  const [quantity, setQuantity] = useState(1);
  const displayPrice = product?.promotionalPrice ?? product?.price ?? 0;
  const { bestInstallment } = usePrice(displayPrice);

  const fetchProduct = useCallback(async () => {
    try {
      const response = await apiClient.get<{ product: ProductDetail }>(`/api/products/${params?.id}`);
      setProduct(response.data.product);
      if (response.data.product.variants && response.data.product.variants.length > 0) {
        setSelectedVoltage(response.data.product.variants[0].name);
      }
    } catch (error) {
      console.error('Erro ao carregar produto:', error);
      toast.error('Produto não encontrado');
    } finally {
      setIsLoading(false);
    }
  }, [params?.id]);

  useEffect(() => {
    if (params?.id) {
      fetchProduct();
    }
  }, [params?.id, fetchProduct]);
  const handleAddToCart = () => {
    // Verifica se usuário está logado somente ao adicionar ao carrinho
    if (!session) {
      toast.error('Faça login para adicionar produtos ao carrinho');
      router.push('/auth/login');
      return;
    }
    if (product?.variants && product.variants.length > 0 && !selectedVoltage) {
      toast.error('Selecione uma voltagem');
      return;
    }

    if (!product) return;

    const unitPrice = product.promotionalPrice ?? product.price;

    // Adiciona ao carrinho no localStorage
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existingItem = cart.find((item: any) => item.id === product.id);
    
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.push({
        id: product.id,
        sku: product.sku,
        ean: product.ean,
        name: product.name,
        price: unitPrice,
        imageUrl: product.imageUrl || product.images?.[0]?.url || '/placeholder.jpg',
        quantity: quantity,
        selectedVoltage: selectedVoltage,
        weightKg: product.weight ?? undefined,
        dimensions: product.dimensions ?? undefined,
      });
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    toast.success(`${quantity} ${quantity > 1 ? 'itens adicionados' : 'item adicionado'} ao carrinho!`);
    
    // Dispara evento customizado para atualizar o header
    window.dispatchEvent(new Event('cartUpdated'));
  };

  if (isLoading) {
    return (
      <>
        {!searchParams.get('embed') && <Header />}
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
        {!searchParams.get('embed') && <Footer />}
      </>
    );
  }

  if (!product) {
    return (
      <>
        {!searchParams.get('embed') && <Header />}
        <div className="min-h-screen flex items-center justify-center">
          <p>Produto não encontrado</p>
        </div>
        {!searchParams.get('embed') && <Footer />}
      </>
    );
  }

  return (
    <>
      {product && (
        <Script
          id="product-structured-data"
          type="application/ld+json"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org/',
              '@type': 'Product',
              name: product.name,
              image: product.imageUrl || product.images?.[0]?.url || undefined,
              description: product.description,
              sku: product.sku,
              gtin13: product.ean,
              productID: product.id,
              category: product.category?.name,
              brand: 'Shopping das Ferramentas',
              offers: {
                '@type': 'Offer',
                priceCurrency: 'BRL',
                price: displayPrice,
                availability: (product.stock ?? 0) > 0 ? 'http://schema.org/InStock' : 'http://schema.org/OutOfStock',
                url: typeof window !== 'undefined' ? window.location.href : undefined,
              },
            }),
          }}
        />
      )}
      {!searchParams.get('embed') && <Header />}
      <main className="min-h-screen bg-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Image Gallery */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <div className="aspect-square bg-metallic-100 rounded-2xl flex items-center justify-center overflow-hidden">
                {product.imageUrl || product.images?.[0]?.url ? (
                  <Image
                    src={product.imageUrl || product.images?.[0]?.url || ''}
                    alt={product.name}
                    fill
                    className="object-cover"
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    priority
                  />
                ) : (
                  <p className="text-6xl">🔨</p>
                )}
              </div>
            </motion.div>

            {/* Product Info - Buy Box */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              {/* Category */}
              <div className="text-sm text-primary-600 font-semibold">
                {product.category?.name}
              </div>

              {/* Title */}
              <h1 className="text-4xl font-bold text-metallic-900">
                {product.name}
              </h1>

              {/* Rating */}
              <div className="flex items-center gap-2">
                <div className="flex text-yellow-400">
                  {'★'.repeat(5)}
                </div>
                <span className="text-sm text-metallic-600">(48 avaliações)</span>
              </div>

              {/* Price */}
              <div className="border-t border-b border-metallic-200 py-6 space-y-2">
                {product.compareAtPrice && (
                  <p className="text-sm text-metallic-600 line-through">
                    De R$ {product.compareAtPrice.toFixed(2)}
                  </p>
                )}
                <p className="text-4xl font-bold text-primary-600">
                  R$ {displayPrice.toFixed(2)}
                </p>
                {bestInstallment && (
                  <p className="text-sm text-metallic-600">
                    ou {bestInstallment.installments}x de R$ {bestInstallment.installmentValue.toFixed(2)}
                  </p>
                )}
              </div>

              {/* Voltage Selection */}
              {product.variants && product.variants.length > 0 && (
                <div className="space-y-3">
                  <Label>Voltagem*</Label>
                  <div className="flex gap-3">
                    {product.variants.map((variant) => (
                      <button
                        key={variant.id}
                        onClick={() => setSelectedVoltage(variant.name)}
                        className={`px-6 py-3 rounded-lg border-2 font-semibold transition-all ${
                          selectedVoltage === variant.name
                            ? 'border-primary-600 bg-primary-50 text-primary-700'
                            : 'border-metallic-300 hover:border-metallic-400'
                        }`}
                      >
                        {variant.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div className="space-y-3">
                <Label>Quantidade</Label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-4 py-2 border border-metallic-300 rounded-lg hover:bg-metallic-50"
                  >
                    -
                  </button>
                  <span className="px-6 py-2 border border-metallic-300 rounded-lg font-semibold">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="px-4 py-2 border border-metallic-300 rounded-lg hover:bg-metallic-50"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex gap-3">
                <Button
                  size="lg"
                  className="flex-1 h-14 text-lg"
                  onClick={handleAddToCart}
                >
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Adicionar ao Carrinho
                </Button>
                <Button size="lg" variant="outline" className="h-14 px-6">
                  <Heart className="h-5 w-5" />
                </Button>
              </div>

              {/* Features */}
              <div className="grid grid-cols-3 gap-4 pt-6">
                <div className="text-center">
                  <Truck className="h-8 w-8 text-primary-600 mx-auto mb-2" />
                  <p className="text-xs font-semibold">Frete Grátis</p>
                  <p className="text-xs text-metallic-600">Acima de R$ 299</p>
                </div>
                <div className="text-center">
                  <Shield className="h-8 w-8 text-primary-600 mx-auto mb-2" />
                  <p className="text-xs font-semibold">12 Meses</p>
                  <p className="text-xs text-metallic-600">Garantia</p>
                </div>
                <div className="text-center">
                  <CreditCard className="h-8 w-8 text-primary-600 mx-auto mb-2" />
                  <p className="text-xs font-semibold">Parcele</p>
                  <p className="text-xs text-metallic-600">Sem Juros</p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Description & Specs */}
          <div className="mt-16 grid lg:grid-cols-2 gap-12">
            <div>
              <h2 className="text-2xl font-bold text-metallic-900 mb-4">
                Descrição
              </h2>
              <p className="text-metallic-700 leading-relaxed">
                {product.description}
              </p>
            </div>

            {product.specs && (
              <div>
                <h2 className="text-2xl font-bold text-metallic-900 mb-4">
                  Especificações Técnicas
                </h2>
                <div className="bg-metallic-50 rounded-lg p-6 space-y-3">
                  {Object.entries(product.specs).map(([key, value]) => (
                    <div key={key} className="flex justify-between border-b border-metallic-200 pb-2">
                      <span className="font-semibold text-metallic-700">{key}:</span>
                      <span className="text-metallic-600">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      {!searchParams.get('embed') && <Footer />}
    </>
  );
}
