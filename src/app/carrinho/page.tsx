'use client';

import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { motion } from 'framer-motion';
import { ShoppingCart, Package, Check, Truck, CreditCard, Trash2, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { generateQuotePdf } from '@/lib/export/quote';
import { useSession } from 'next-auth/react';

const steps = [
  { icon: ShoppingCart, label: 'Carrinho', active: true },
  { icon: Package, label: 'Dados', active: false },
  { icon: Truck, label: 'Entrega', active: false },
  { icon: CreditCard, label: 'Pagamento', active: false },
  { icon: Check, label: 'Confirmação', active: false },
];

interface CartItem {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  quantity: number;
  selectedVoltage?: string;
  sku?: string | null;
  ean?: string | null;
  weightKg?: number | null;
  dimensions?: Record<string, unknown> | null;
}

type ShippingOption = {
  id: string;
  service: string;
  carrier: string;
  price: number;
  etaDays?: number;
  pickup?: boolean;
  notes?: string;
};

type PickupPoint = {
  id: string;
  name: string;
  address: string;
  city?: string;
  state?: string;
  zip?: string;
  company?: string;
};

export default function CartPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [shippingZip, setShippingZip] = useState('');
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [selectedShipping, setSelectedShipping] = useState<ShippingOption | null>(null);
  const [isShippingLoading, setIsShippingLoading] = useState(false);
  const [pickupPoints, setPickupPoints] = useState<PickupPoint[]>([]);
  const [isPickupLoading, setIsPickupLoading] = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteForm, setQuoteForm] = useState({
    name: '',
    email: '',
    phone: '',
    taxId: '',
    stateRegistration: '',
    validityDays: 7,
    notes: '',
  });

  useEffect(() => {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    setCartItems(cart);
  }, []);


  useEffect(() => {
    if (session?.user) {
      setQuoteForm((prev) => ({
        ...prev,
        name: prev.name || (session.user.name as string) || '',
        email: prev.email || (session.user.email as string) || '',
      }));
    }
  }, [session]);

  const updateQuantity = (id: string, delta: number) => {
    const updatedCart = cartItems.map(item => {
      if (item.id === id) {
        const newQuantity = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQuantity };
      }
      return item;
    });
    setCartItems(updatedCart);
    localStorage.setItem('cart', JSON.stringify(updatedCart));
    window.dispatchEvent(new Event('cartUpdated'));
  };

  const removeItem = (id: string) => {
    const updatedCart = cartItems.filter(item => item.id !== id);
    setCartItems(updatedCart);
    localStorage.setItem('cart', JSON.stringify(updatedCart));
    window.dispatchEvent(new Event('cartUpdated'));
  };

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shippingValue = selectedShipping?.price ?? 0;
  const total = subtotal + shippingValue;

  const calculateShipping = async () => {
    if (!shippingZip || shippingZip.replace(/\D/g, '').length < 8) {
      toast.error('Informe um CEP válido');
      return;
    }
    if (!cartItems.length) {
      toast.error('Adicione itens ao carrinho');
      return;
    }
    setIsShippingLoading(true);
    try {
      const response = await apiClient.post('/api/shipping/quote', {
        destinationZip: shippingZip,
        items: cartItems.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
          weightKg: item.weightKg,
          dimensions: item.dimensions,
          price: item.price,
        })),
      });
      const opts: ShippingOption[] = Array.isArray(response.data?.options) ? response.data.options : [];
      // Evita duplicar retirada: usamos apenas o payload do backend, que já inclui pickup.
      const unique: ShippingOption[] = Array.from(new Map(opts.map((o) => [o.id, o])).values());
      setShippingOptions(unique);
      setSelectedShipping(unique[0] ?? null);
      loadPickupPoints(shippingZip);
      toast.success('Opções de frete atualizadas');
    } catch (error) {
      console.error('[SHIPPING]', error);
      toast.error('Não foi possível calcular o frete agora');
    } finally {
      setIsShippingLoading(false);
    }
  };

  const loadPickupPoints = async (zip: string) => {
    if (!zip) return;
    setIsPickupLoading(true);
    try {
      const res = await apiClient.get('/api/shipping/pickups', { params: { zip } });
      const points = Array.isArray(res.data) ? res.data : [];
      setPickupPoints(points);
    } catch (error) {
      console.error('[PICKUPS]', error);
      setPickupPoints([]);
      toast.error('Não foi possível buscar pontos de coleta agora');
    } finally {
      setIsPickupLoading(false);
    }
  };

  const handleDownloadQuote = async () => {
    if (!cartItems.length) {
      toast.error('Adicione itens ao carrinho');
      return;
    }
    if (!quoteForm.name || !quoteForm.email) {
      toast.error('Informe nome e email');
      return;
    }

    setQuoteLoading(true);
    try {
      const validityDays = Number(quoteForm.validityDays) || 7;
      const shipping = selectedShipping || shippingOptions.find((o) => o.pickup) || null;
      const payload = {
        items: cartItems.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
        shippingOption: shipping ? {
          id: shipping.id,
          service: shipping.service,
          carrier: shipping.carrier,
          price: shipping.price,
          etaDays: shipping.etaDays,
          pickup: shipping.pickup,
        } : undefined,
        destinationZip: shippingZip || undefined,
        validityDays,
        notes: quoteForm.notes || undefined,
        customer: {
          name: quoteForm.name,
          email: quoteForm.email,
          phone: quoteForm.phone || undefined,
          taxId: quoteForm.taxId || undefined,
          stateRegistration: quoteForm.stateRegistration || undefined,
        },
      };

      const response = await apiClient.post('/api/orders/quote', payload);
      const order = response.data?.order;

      const pdfBlob = await generateQuotePdf({
        orderNumber: order?.orderNumber || 'ORCAMENTO',
        issuedAt: order?.createdAt || new Date().toISOString(),
        validityDays,
        customer: {
          name: quoteForm.name,
          email: quoteForm.email,
          phone: quoteForm.phone || undefined,
          taxId: quoteForm.taxId || undefined,
          stateRegistration: quoteForm.stateRegistration || undefined,
        },
        items: cartItems.map((item) => ({
          name: item.name,
          sku: item.sku || undefined,
          quantity: item.quantity,
          price: item.price,
          total: item.price * item.quantity,
        })),
        totals: { subtotal, shipping: shipping?.price || 0, total: subtotal + (shipping?.price || 0) },
        store: {
          name: process.env.NEXT_PUBLIC_STORE_NAME || 'Shopping das Ferramentas',
          cnpj: process.env.NEXT_PUBLIC_STORE_CNPJ,
          phone: process.env.NEXT_PUBLIC_STORE_PHONE,
          email: process.env.NEXT_PUBLIC_STORE_EMAIL,
          address: process.env.NEXT_PUBLIC_STORE_ADDRESS || 'Loja Física - Salvador/BA',
          bankDetails: process.env.NEXT_PUBLIC_STORE_BANK_DETAILS,
        },
        shipping: shipping
          ? { method: shipping.service, etaDays: shipping.etaDays, pickup: shipping.pickup }
          : undefined,
        notes: quoteForm.notes || undefined,
      });

      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orcamento-${order?.orderNumber || Date.now()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Orçamento salvo como QUOTE e PDF gerado');
    } catch (error) {
      console.error('[QUOTE_PDF]', error);
      toast.error('Erro ao gerar orçamento');
    } finally {
      setQuoteLoading(false);
    }
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-metallic-50 py-12">
        <div className="container mx-auto px-4">
          {/* Steps */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <div className="flex items-center justify-center gap-4 overflow-x-auto pb-4">
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div key={index} className="flex items-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className={`flex flex-col items-center ${
                        step.active ? 'text-primary-600' : 'text-metallic-400'
                      }`}
                    >
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          step.active
                            ? 'bg-primary-600 text-white'
                            : 'bg-metallic-200'
                        }`}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                      <span className="text-xs mt-2 font-medium">
                        {step.label}
                      </span>
                    </motion.div>
                    {index < steps.length - 1 && (
                      <div
                        className={`h-0.5 w-12 mx-2 ${
                          step.active ? 'bg-primary-600' : 'bg-metallic-200'
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Cart Items */}
          {cartItems.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                {cartItems.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white rounded-lg shadow p-4 flex gap-4"
                  >
                    <div className="relative w-24 h-24 flex-shrink-0">
                      <Image
                        src={!item.imageUrl || item.imageUrl.includes('/products/') ? '/placeholder.svg' : item.imageUrl}
                        alt={item.name}
                        fill
                        className="object-cover rounded"
                        unoptimized={!item.imageUrl || item.imageUrl.includes('/products/')}
                      />
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{item.name}</h3>
                      {item.selectedVoltage && (
                        <p className="text-sm text-gray-600">Voltagem: {item.selectedVoltage}</p>
                      )}
                      <p className="text-primary-600 font-bold mt-2">
                        R$ {item.price.toFixed(2)}
                      </p>
                    </div>

                    <div className="flex flex-col items-end justify-between">
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>

                      <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-8 text-center font-semibold">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="lg:col-span-1 space-y-6">
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white rounded-lg shadow p-6"
                >
                  <h2 className="text-xl font-bold mb-4">Frete em tempo real</h2>
                  <div className="flex gap-2 mb-4">
                    <input
                      type="text"
                      value={shippingZip}
                      onChange={(e) => setShippingZip(e.target.value)}
                      placeholder="Digite seu CEP"
                      className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <Button onClick={calculateShipping} disabled={isShippingLoading}>
                      {isShippingLoading ? 'Calculando...' : 'Calcular'}
                    </Button>
                  </div>

                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {shippingOptions.map((option) => (
                      <label
                        key={option.id}
                        className={`flex items-start gap-3 border rounded-lg p-3 cursor-pointer ${selectedShipping?.id === option.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200'}`}
                      >
                        <input
                          type="radio"
                          name="shipping"
                          className="mt-1"
                          checked={selectedShipping?.id === option.id}
                          onChange={() => setSelectedShipping(option)}
                        />
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <div>
                              <p className="font-semibold">{option.service}</p>
                              <p className="text-xs text-gray-600">{option.carrier}</p>
                            </div>
                            <p className="font-bold text-primary-700">{option.price === 0 ? 'Grátis' : `R$ ${option.price.toFixed(2)}`}</p>
                          </div>
                          <div className="flex gap-3 text-xs text-gray-600 mt-1">
                            {typeof option.etaDays === 'number' && <span>{option.etaDays} dia(s) úteis</span>}
                            {option.pickup && <span>Retirada</span>}
                            {option.notes && <span>{option.notes}</span>}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>

                  <div className="mt-4 border-t pt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm">Pontos de coleta (Melhor Envio)</p>
                        <p className="text-xs text-gray-600">Mostra locais próximos para retirada</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadPickupPoints(shippingZip)}
                        disabled={isPickupLoading || !shippingZip}
                      >
                        {isPickupLoading ? 'Buscando...' : 'Atualizar'}
                      </Button>
                    </div>
                    {pickupPoints.length === 0 && !isPickupLoading && (
                      <p className="text-xs text-gray-600">Informe o CEP e clique em atualizar para ver pontos de coleta.</p>
                    )}
                    {pickupPoints.length > 0 && (
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {pickupPoints.map((p) => (
                          <div key={p.id} className="border border-gray-200 rounded-lg p-3 text-sm bg-gray-50">
                            <p className="font-semibold text-gray-900">{p.name}</p>
                            <p className="text-gray-700">{p.address}</p>
                            <p className="text-xs text-gray-600">{[p.city, p.state].filter(Boolean).join(' / ')} {p.zip ? ` - CEP ${p.zip}` : ''}</p>
                            {p.company && <p className="text-xs text-gray-600">Operado por {p.company}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white rounded-lg shadow p-6"
                >
                  <h2 className="text-xl font-bold mb-4">Resumo do Pedido</h2>
                  
                  <div className="space-y-2 mb-4 pb-4 border-b">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal</span>
                      <span>R$ {subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Frete</span>
                      <span>{shippingValue === 0 ? 'Grátis' : `R$ ${shippingValue.toFixed(2)}`}</span>
                    </div>
                  </div>

                  <div className="flex justify-between text-xl font-bold mb-6">
                    <span>Total</span>
                    <span className="text-primary-600">R$ {total.toFixed(2)}</span>
                  </div>

                  <Button className="w-full" size="lg" onClick={() => router.push('/checkout')}>
                    Finalizar Compra
                  </Button>

                  <Link href="/produtos">
                    <Button variant="outline" className="w-full mt-3">
                      Continuar Comprando
                    </Button>
                  </Link>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white rounded-lg shadow p-6"
                >
                  <h2 className="text-xl font-bold mb-4">Gerar Orçamento (PDF)</h2>
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm text-gray-700">Nome</label>
                        <input
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                          value={quoteForm.name}
                          onChange={(e) => setQuoteForm({ ...quoteForm, name: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-700">Email</label>
                        <input
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                          value={quoteForm.email}
                          onChange={(e) => setQuoteForm({ ...quoteForm, email: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm text-gray-700">Telefone</label>
                        <input
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                          value={quoteForm.phone}
                          onChange={(e) => setQuoteForm({ ...quoteForm, phone: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-700">CPF ou CNPJ</label>
                        <input
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                          value={quoteForm.taxId}
                          onChange={(e) => setQuoteForm({ ...quoteForm, taxId: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm text-gray-700">Inscrição Estadual (se houver)</label>
                        <input
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                          value={quoteForm.stateRegistration}
                          onChange={(e) => setQuoteForm({ ...quoteForm, stateRegistration: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-700">Validade (dias)</label>
                        <input
                          type="number"
                          min={1}
                          max={30}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                          value={quoteForm.validityDays}
                          onChange={(e) => setQuoteForm({ ...quoteForm, validityDays: Number(e.target.value) })}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-gray-700">Observações</label>
                      <textarea
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        rows={3}
                        value={quoteForm.notes}
                        onChange={(e) => setQuoteForm({ ...quoteForm, notes: e.target.value })}
                        placeholder="Dados bancários, condições especiais..."
                      />
                    </div>
                    <Button onClick={handleDownloadQuote} className="w-full" disabled={quoteLoading}>
                      {quoteLoading ? 'Gerando PDF...' : 'Baixar Orçamento (PDF)'}
                    </Button>
                    <p className="text-xs text-gray-600">Salva o pedido como QUOTE (sem baixar estoque) e gera um PDF timbrado.</p>
                  </div>
                </motion.div>
              </div>
            </div>
          )}

          {/* Empty Cart */}
          {cartItems.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-2xl mx-auto"
            >
              <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                  className="w-32 h-32 mx-auto mb-6 bg-metallic-100 rounded-full flex items-center justify-center"
                >
                  <ShoppingCart className="h-16 w-16 text-metallic-400" />
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-3xl font-bold text-metallic-900 mb-4"
                >
                  Seu carrinho está vazio
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-metallic-600 mb-8 text-lg"
                >
                  Adicione produtos incríveis e comece suas compras!
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <Link href="/produtos">
                    <Button size="lg" className="px-8">
                      <ShoppingCart className="mr-2 h-5 w-5" />
                      Começar a Comprar
                    </Button>
                  </Link>
                </motion.div>

                {/* Suggested Categories */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="mt-12 pt-8 border-t border-metallic-200"
                >
                  <p className="text-sm text-metallic-600 mb-4">
                    Sugestões para você:
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {[
                      'Ferramentas Elétricas',
                      'Parafusadeiras',
                      'Furadeiras',
                      'EPIs',
                    ].map((cat, i) => (
                      <motion.div
                        key={cat}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.7 + i * 0.1 }}
                      >
                        <Link href="/produtos">
                          <span className="px-4 py-2 bg-primary-50 text-primary-700 rounded-full text-sm font-medium hover:bg-primary-100 transition-colors cursor-pointer">
                            {cat}
                          </span>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
