'use client';

import logger from "@/lib/logger";
import { useEffect, useState, useCallback, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ShoppingCart, Truck, Shield, CreditCard, Heart, Star } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { usePrice } from "@/hooks/use-price";
import { useCart } from "@/contexts/cart-context";
import Image from "next/image";
// Não exigimos sessão para adicionar ao carrinho — usamos cache local
import { ProductReviews } from "@/components/product-reviews";
import { Breadcrumb } from "@/components/breadcrumb";
import { RelatedProducts } from "@/components/related-products";
import { useRecentlyViewed } from "@/hooks/use-recently-viewed";
import { useWishlist } from "@/hooks/use-wishlist";

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

function toMoney(v: unknown): string {
  const n = Number(v);
  return (Number.isFinite(n) ? n : 0).toFixed(2);
}

function ProductDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVoltage, setSelectedVoltage] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [reviewStats, setReviewStats] = useState<{ averageRating: number; totalReviews: number } | null>(null);
  const [freeShippingMinValue, setFreeShippingMinValue] = useState(299);
  const displayPrice = Number(product?.promotionalPrice ?? product?.price ?? 0) || 0;
  const { bestInstallment, installmentOptions, loading: loadingInstallments } = usePrice(displayPrice);
  const [showAllInstallments, setShowAllInstallments] = useState(false);

  const { addItem } = useCart();
  const { addProduct } = useRecentlyViewed();
  const { ids: wishlistIds, toggle: toggleWishlist } = useWishlist();
  const [stockAlertEmail, setStockAlertEmail] = useState('');
  const [stockAlertSent, setStockAlertSent] = useState(false);
  const [stockAlertLoading, setStockAlertLoading] = useState(false);

  const fetchProduct = useCallback(async () => {
    try {
      const response = await apiClient.get<{ product: ProductDetail }>(`/api/products/${params?.id}`);
      const p = response.data.product;
      setProduct({
        ...p,
        price: Number(p.price),
        promotionalPrice: p.promotionalPrice != null ? Number(p.promotionalPrice) : null,
        compareAtPrice: p.compareAtPrice != null ? Number(p.compareAtPrice) : null,
      });
      if (response.data.product.variants && response.data.product.variants.length > 0) {
        setSelectedVoltage(response.data.product.variants[0].name);
      }

      // Buscar estatísticas de avaliações
      try {
        const reviewsRes = await apiClient.get<{ stats: { averageRating: number; totalReviews: number } }>(`/api/products/${params?.id}/reviews?limit=1`);
        setReviewStats(reviewsRes.data.stats);
      } catch {
        // Ignora erro de reviews
      }
    } catch (error) {
      logger.error(error, 'Erro ao carregar produto');
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

  useEffect(() => {
    fetch('/api/financial/config')
      .then((r) => r.ok ? r.json() : null)
      .then((cfg) => { if (cfg?.freeShippingMinValue) setFreeShippingMinValue(Number(cfg.freeShippingMinValue)); })
      .catch(() => {});
  }, []);

  // Track this product as recently viewed
  useEffect(() => {
    if (product?.id) {
      addProduct(product.id);
    }
  }, [product?.id]);
  const handleAddToCart = () => {
    if (product?.variants && product.variants.length > 0 && !selectedVoltage) {
      toast.error("Selecione uma voltagem");
      return;
    }

    if (!product) return;

    addItem({
      id: product.id,
      sku: product.sku ?? null,
      ean: product.ean ?? null,
      name: product.name,
      price: Number(product.promotionalPrice ?? product.price) || 0,
      imageUrl: product.imageUrl || product.images?.[0]?.url || "/placeholder.jpg",
      quantity,
      selectedVoltage: selectedVoltage || undefined,
      weightKg: product.weight ?? null,
      dimensions: product.dimensions ?? null,
    });

    toast.success(`${quantity} ${quantity > 1 ? "itens adicionados" : "item adicionado"} ao carrinho!`);
  };

  if (isLoading) {
    return (
      <>
        {!searchParams.get("embed") && <Header />}
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
        {!searchParams.get("embed") && <Footer />}
      </>
    );
  }

  if (!product) {
    return (
      <>
        {!searchParams.get("embed") && <Header />}
        <div className="min-h-screen flex items-center justify-center">
          <p>Produto não encontrado</p>
        </div>
        {!searchParams.get("embed") && <Footer />}
      </>
    );
  }

  return (
    <>
      {!searchParams.get("embed") && <Header />}
      <main className="min-h-screen bg-white py-12">
        <div className="container mx-auto px-4">
          {!searchParams.get("embed") && (
            <Breadcrumb
              className="mb-6"
              items={[
                { label: 'Produtos', href: '/produtos' },
                ...(product.category?.name
                  ? [{ label: product.category.name, href: `/produtos?categoria=${encodeURIComponent(product.category.name)}` }]
                  : []),
                { label: product.name },
              ]}
            />
          )}
          <div className="grid lg:grid-cols-2 gap-6 lg:gap-12">
            {/* Image Gallery */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <div className="aspect-square bg-gray-100 rounded-sm border border-gray-200 flex items-center justify-center overflow-hidden relative">{product.imageUrl || product.images?.[0]?.url ? <Image src={product.imageUrl || product.images?.[0]?.url || ""} alt={product.name} fill className="object-contain" sizes="(min-width: 1024px) 50vw, 100vw" priority /> : <p className="text-6xl">🔨</p>}</div>
            </motion.div>

            {/* Product Info - Buy Box */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              {/* Category */}
              <div className="text-sm text-primary-600 font-semibold">{product.category?.name}</div>

              {/* Title */}
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-metallic-900">{product.name}</h1>

              {/* Rating */}
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className={`h-5 w-5 ${star <= Math.round(reviewStats?.averageRating || 0) ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 text-gray-200"}`} />
                  ))}
                </div>
                <span className="text-sm text-metallic-600">{reviewStats?.totalReviews ? `(${reviewStats.totalReviews} ${reviewStats.totalReviews === 1 ? "avaliação" : "avaliações"})` : "(Sem avaliações)"}</span>
              </div>

              {/* Price */}
              <div className="border-t border-b border-metallic-200 py-6 space-y-2">
                {product.compareAtPrice && Number(product.compareAtPrice) > 0 && (
                  <p className="text-sm text-metallic-600 line-through">De R$ {toMoney(product.compareAtPrice)}</p>
                )}
                <p className="text-3xl lg:text-4xl font-bold text-primary-600">R$ {toMoney(displayPrice)}</p>

                {/* Parcelas Mercado Pago */}
                {loadingInstallments ? (
                  <div className="h-5 w-48 bg-gray-100 rounded animate-pulse" />
                ) : bestInstallment ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm text-metallic-700">
                      ou{' '}
                      <span className="font-semibold text-metallic-900">
                        {bestInstallment.installments}x de R$ {toMoney(bestInstallment.installmentValue)}
                      </span>
                      {bestInstallment.interestFree ? (
                        <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold bg-green-100 text-green-700">
                          sem juros
                        </span>
                      ) : (
                        <span className="ml-1 text-metallic-500 text-xs">
                          (total R$ {toMoney(bestInstallment.total)})
                        </span>
                      )}
                    </p>
                    <span className="text-[11px] text-metallic-400">
                      via <span className="font-bold text-[#009EE3]">Mercado Pago</span>
                    </span>
                  </div>
                ) : null}

                {/* Ver todas as parcelas */}
                {!loadingInstallments && installmentOptions.length > 1 && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowAllInstallments((v) => !v)}
                      className="text-xs text-primary-600 hover:underline font-medium flex items-center gap-1 mt-1"
                    >
                      {showAllInstallments ? 'Ocultar parcelas' : 'Ver todas as parcelas'}
                      <svg className={`h-3 w-3 transition-transform ${showAllInstallments ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                      </svg>
                    </button>

                    {showAllInstallments && (
                      <div className="mt-3 rounded-lg border border-gray-100 overflow-hidden">
                        <div className="bg-gray-50 px-3 py-2 flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Parcelas no cartão</span>
                          <span className="text-xs font-bold text-[#009EE3]">Mercado Pago</span>
                        </div>
                        <table className="w-full text-sm">
                          <tbody>
                            {installmentOptions.map((opt) => (
                              <tr key={opt.installments} className="border-t border-gray-100 hover:bg-gray-50">
                                <td className="px-3 py-2 font-semibold text-metallic-900 w-16">
                                  {opt.installments === 1 ? 'À Vista' : `${opt.installments}x`}
                                </td>
                                <td className="px-3 py-2 text-metallic-700">
                                  R$ {toMoney(opt.installmentValue)}
                                </td>
                                <td className="px-3 py-2 text-right text-xs text-metallic-500">
                                  R$ {toMoney(opt.total)}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  {opt.interestFree ? (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold bg-green-100 text-green-700">
                                      sem juros
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold bg-orange-100 text-orange-700">
                                      com juros
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Voltage Selection */}
              {product.variants && product.variants.length > 0 && (
                <div className="space-y-3">
                  <Label>Voltagem*</Label>
                  <div className="flex flex-wrap gap-3">
                    {product.variants.map((variant) => (
                      <button key={variant.id} onClick={() => setSelectedVoltage(variant.name)} className={`min-h-[44px] px-6 py-2 rounded-sm border-2 font-semibold transition-all ${selectedVoltage === variant.name ? "border-[#CC1020] bg-red-50 text-[#CC1020]" : "border-gray-300 hover:border-gray-400"}`}>
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
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="Diminuir quantidade" className="min-w-[44px] min-h-[44px] px-4 py-2 border border-gray-200 rounded-sm hover:bg-gray-50 text-lg font-bold">
                    −
                  </button>
                  <span className="px-6 py-2 border border-gray-200 rounded-sm font-semibold text-lg min-w-[56px] text-center" aria-live="polite" aria-label={`Quantidade: ${quantity}`}>{quantity}</span>
                  <button onClick={() => setQuantity(quantity + 1)} aria-label="Aumentar quantidade" className="min-w-[44px] min-h-[44px] px-4 py-2 border border-gray-200 rounded-sm hover:bg-gray-50 text-lg font-bold">
                    +
                  </button>
                </div>
              </div>

              {/* Stock Status */}
              {product.stock !== undefined && (
                <div className="flex items-center gap-2">
                  {product.stock === 0 ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-gray-100 text-gray-600 border border-gray-300">
                      <span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />
                      Fora de estoque
                    </span>
                  ) : product.stock <= 5 ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-orange-50 text-orange-700 border border-orange-200">
                      <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />
                      Últimas {product.stock} unidades
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-green-50 text-green-700 border border-green-200">
                      <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                      Em estoque
                    </span>
                  )}
                </div>
              )}

              {/* Aviso de estoque */}
              {product.stock === 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  {stockAlertSent ? (
                    <p className="text-sm text-green-700 font-medium">✓ Avisaremos você assim que o produto voltar ao estoque!</p>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-gray-700 mb-2">Avise-me quando voltar ao estoque</p>
                      <div className="flex gap-2">
                        <input
                          type="email"
                          placeholder="Seu e-mail"
                          value={stockAlertEmail}
                          onChange={e => setStockAlertEmail(e.target.value)}
                          className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                        <Button
                          size="sm"
                          disabled={stockAlertLoading || !stockAlertEmail}
                          onClick={async () => {
                            setStockAlertLoading(true);
                            try {
                              const res = await fetch(`/api/products/${product.id}/stock-alert`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ email: stockAlertEmail }),
                              });
                              if (res.ok) setStockAlertSent(true);
                              else toast.error('Erro ao registrar alerta');
                            } finally {
                              setStockAlertLoading(false);
                            }
                          }}
                        >
                          {stockAlertLoading ? '...' : 'Avisar'}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* CTA Buttons */}
              <div className="flex gap-3">
                <Button
                  size="lg"
                  className="flex-1 h-14 text-lg"
                  onClick={handleAddToCart}
                  disabled={product.stock === 0}
                >
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  {product.stock === 0 ? "Indisponível" : "Adicionar ao Carrinho"}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className={`h-14 px-6 transition-colors ${wishlistIds.has(product.id) ? 'text-red-500 border-red-300 hover:bg-red-50' : 'hover:text-red-500 hover:border-red-300'}`}
                  aria-label={wishlistIds.has(product.id) ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                  onClick={() => toggleWishlist(product.id, product.name)}
                >
                  <Heart className={`h-5 w-5 ${wishlistIds.has(product.id) ? 'fill-red-500' : ''}`} />
                </Button>
              </div>

              {/* Features */}
              <div className="grid grid-cols-3 gap-4 pt-6">
                <div className="text-center">
                  <Truck className="h-8 w-8 text-primary-600 mx-auto mb-2" />
                  <p className="text-xs font-semibold">Frete Grátis</p>
                  <p className="text-xs text-metallic-600">Acima de R$ {freeShippingMinValue.toFixed(0)}</p>
                </div>
                <div className="text-center">
                  <Shield className="h-8 w-8 text-primary-600 mx-auto mb-2" />
                  <p className="text-xs font-semibold">12 Meses</p>
                  <p className="text-xs text-metallic-600">Garantia</p>
                </div>
                <div className="text-center">
                  <CreditCard className="h-8 w-8 text-primary-600 mx-auto mb-2" />
                  <p className="text-xs font-semibold">
                    {bestInstallment ? `${bestInstallment.installments}x` : 'Parcele'}
                  </p>
                  <p className="text-xs text-metallic-600">
                    {bestInstallment
                      ? bestInstallment.interestFree ? 'Sem Juros' : 'No Cartão'
                      : 'No Cartão'}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Description & Specs */}
          <div className="mt-8 lg:mt-16 grid lg:grid-cols-2 gap-6 lg:gap-12">
            <div>
              <h2 className="text-2xl font-bold text-metallic-900 mb-4">Descrição</h2>
              <p className="text-metallic-700 leading-relaxed">{product.description}</p>
            </div>

            {product.specs && (
              <div>
                <h2 className="text-2xl font-bold text-metallic-900 mb-4">Especificações Técnicas</h2>
                <div className="bg-gray-50 rounded-sm p-6 space-y-3 border border-gray-100">
                  {Object.entries(product.specs).map(([key, value]) => (
                    <div key={key} className="flex justify-between gap-4 border-b border-metallic-200 pb-2">
                      <span className="font-semibold text-metallic-700 shrink-0">{key}:</span>
                      <span className="text-metallic-600 text-right min-w-0 break-words">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Seção de Avaliações */}
          <div className="mt-16">
            <h2 className="text-2xl font-bold text-metallic-900 mb-6">Avaliações dos Clientes</h2>
            <ProductReviews productId={product.id} productName={product.name} />
          </div>

          {/* Produtos Relacionados */}
          <RelatedProducts productId={product.id} />
        </div>
      </main>
      {!searchParams.get("embed") && <Footer />}
    </>
  );
}

export function ProductDetailPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    }>
      <ProductDetailContent />
    </Suspense>
  );
}
