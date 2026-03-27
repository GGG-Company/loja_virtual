'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Package, MapPin, RotateCcw, Loader2, Check, RefreshCw } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { statusToPt, statusBadgeClass } from '@/lib/i18n';
import { toast } from 'sonner';

// ── Masks ──────────────────────────────────────────────────────────────────
function maskPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
}
function maskCpf(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
}

type Order = {
  id: string;
  createdAt: string;
  status: string;
  total: number;
};

type ProfileForm = {
  name: string;
  phone: string;
  cpf: string;
};

export default function MyAccountPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'perfil' | 'pedidos' | 'devolucoes' | 'enderecos'>('perfil');
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [reorderingId, setReorderingId] = useState<string | null>(null);

  // ── Profile form state ────────────────────────────────────────────────────
  const [profile, setProfile] = useState<ProfileForm>({ name: '', phone: '', cpf: '' });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/login');
  }, [status, router]);

  // Pre-populate from session
  useEffect(() => {
    if (session?.user) {
      setProfile((prev) => ({
        name: prev.name || session.user.name || '',
        phone: prev.phone,
        cpf: prev.cpf,
      }));
    }
  }, [session]);

  const fetchOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const response = await apiClient.get('/api/user/orders');
      setOrders(response.data.orders ?? []);
    } catch {
      toast.error('Não foi possível carregar seus pedidos. Tente novamente.');
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'pedidos') fetchOrders();
  }, [activeTab, fetchOrders]);

  const handleReorder = useCallback(async (orderId: string) => {
    setReorderingId(orderId);
    try {
      const response = await apiClient.get<{ items: { productId?: string; quantity: number; price: number; product: { name: string; imageUrl?: string | null } }[] }>(`/api/user/orders/${orderId}`);
      const items = (response.data as any).items ?? [];
      if (items.length === 0) {
        toast.error('Não foi possível obter os itens do pedido.');
        return;
      }
      const cart: unknown[] = JSON.parse(localStorage.getItem('cart') || '[]');
      for (const item of items) {
        const id = item.productId ?? item.product?.id;
        if (!id) continue;
        const existing = (cart as any[]).find((c) => c.id === id);
        if (existing) {
          existing.quantity += item.quantity;
        } else {
          (cart as any[]).push({
            id,
            name: item.product?.name ?? '',
            price: item.price,
            imageUrl: item.product?.imageUrl ?? '/placeholder.jpg',
            quantity: item.quantity,
          });
        }
      }
      localStorage.setItem('cart', JSON.stringify(cart));
      window.dispatchEvent(new Event('cartUpdated'));
      toast.success('Itens adicionados ao carrinho!');
    } catch {
      toast.error('Não foi possível adicionar os itens ao carrinho.');
    } finally {
      setReorderingId(null);
    }
  }, []);

  const handleSaveProfile = async () => {
    if (!profile.name.trim()) {
      toast.error('O nome não pode estar vazio');
      return;
    }
    setProfileSaving(true);
    try {
      await apiClient.put('/api/user/profile', {
        name: profile.name.trim(),
        phone: profile.phone,
        cpf: profile.cpf,
      });
      setProfileSaved(true);
      toast.success('Perfil atualizado com sucesso!');
      setTimeout(() => setProfileSaved(false), 3000);
    } catch {
      toast.error('Erro ao salvar perfil. Tente novamente.');
    } finally {
      setProfileSaving(false);
    }
  };

  const setField = (key: keyof ProfileForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (key === 'phone') val = maskPhone(val);
    if (key === 'cpf') val = maskCpf(val);
    setProfile((p) => ({ ...p, [key]: val }));
    if (profileSaved) setProfileSaved(false);
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#CC1020]" />
      </div>
    );
  }

  if (!session) return null;

  const tabs = [
    { id: 'perfil' as const, label: 'Meu Perfil', icon: User },
    { id: 'pedidos' as const, label: 'Meus Pedidos', icon: Package },
    { id: 'devolucoes' as const, label: 'Devoluções', icon: RotateCcw },
    { id: 'enderecos' as const, label: 'Endereços', icon: MapPin },
  ];

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-6xl mx-auto"
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="w-1 h-10 bg-[#CC1020] rounded-full" />
              <h1 className="font-display text-4xl font-bold text-[#1A1A1A] uppercase">
                Minha Conta
              </h1>
            </div>

            <div className="grid lg:grid-cols-4 gap-6">
              {/* Sidebar */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-sm shadow-md border-t-4 border-[#CC1020] p-5 space-y-1">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        role="tab"
                        aria-selected={activeTab === tab.id}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-sm transition-colors font-body ${
                          activeTab === tab.id
                            ? 'bg-[#CC1020] text-white'
                            : 'hover:bg-gray-100 text-gray-600'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="font-medium">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Content */}
              <div className="lg:col-span-3">
                <div className="bg-white rounded-sm shadow-md border-t-4 border-[#CC1020] p-8">

                  {/* ── PERFIL ──────────────────────────────────────────── */}
                  {activeTab === 'perfil' && (
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-1 h-6 bg-[#CC1020] rounded-full" />
                        <h2 className="font-display text-xl font-bold text-[#1A1A1A] uppercase">
                          Informações Pessoais
                        </h2>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Nome Completo</Label>
                          <Input
                            id="name"
                            value={profile.name}
                            onChange={setField('name')}
                            className="h-12"
                            placeholder="Seu nome completo"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={session.user?.email || ''}
                            disabled
                            className="h-12 bg-gray-50 cursor-not-allowed"
                          />
                          <p className="text-xs text-gray-400">O e-mail não pode ser alterado</p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="phone">Telefone</Label>
                          <Input
                            id="phone"
                            type="tel"
                            inputMode="numeric"
                            value={profile.phone}
                            onChange={setField('phone')}
                            placeholder="(75) 99999-0000"
                            className="h-12"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="cpf">CPF</Label>
                          <Input
                            id="cpf"
                            inputMode="numeric"
                            value={profile.cpf}
                            onChange={setField('cpf')}
                            placeholder="000.000.000-00"
                            className="h-12"
                          />
                        </div>
                      </div>

                      <Button
                        className="h-12 px-8 min-w-[160px]"
                        onClick={handleSaveProfile}
                        disabled={profileSaving}
                      >
                        {profileSaving ? (
                          <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Salvando...</>
                        ) : profileSaved ? (
                          <><Check className="h-4 w-4 mr-2" /> Salvo!</>
                        ) : (
                          'Salvar Alterações'
                        )}
                      </Button>
                    </div>
                  )}

                  {/* ── PEDIDOS ─────────────────────────────────────────── */}
                  {activeTab === 'pedidos' && (
                    <div className="space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="w-1 h-6 bg-[#CC1020] rounded-full" />
                        <h2 className="font-display text-xl font-bold text-[#1A1A1A] uppercase">
                          Histórico de Pedidos
                        </h2>
                      </div>

                      {ordersLoading ? (
                        <div className="space-y-4">
                          {[...Array(3)].map((_, i) => (
                            <div key={i} className="border border-gray-200 rounded-sm p-5 animate-pulse">
                              <div className="flex justify-between items-start mb-3">
                                <div className="space-y-2">
                                  <div className="h-4 w-32 bg-gray-200 rounded" />
                                  <div className="h-3 w-24 bg-gray-100 rounded" />
                                </div>
                                <div className="h-6 w-20 bg-gray-200 rounded-sm" />
                              </div>
                              <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                                <div className="h-6 w-24 bg-gray-200 rounded" />
                                <div className="h-8 w-28 bg-gray-200 rounded-sm" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : orders.length === 0 ? (
                        <div className="text-center py-12">
                          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Package className="h-10 w-10 text-gray-400" />
                          </div>
                          <p className="font-display text-lg font-bold text-[#1A1A1A] uppercase mb-1">
                            Nenhum pedido ainda
                          </p>
                          <p className="text-sm text-gray-500 mb-6">
                            Quando você fizer um pedido, ele aparecerá aqui.
                          </p>
                          <Button asChild>
                            <a href="/produtos">Explorar Produtos</a>
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {orders.map((order) => (
                            <div
                              key={order.id}
                              className="border border-gray-200 rounded-sm p-5 hover:border-[#CC1020]/40 hover:shadow-sm transition-all"
                            >
                              <div className="flex justify-between items-start mb-3">
                                <div>
                                  <p className="font-semibold text-[#1A1A1A]">
                                    Pedido #{order.id.slice(0, 8).toUpperCase()}
                                  </p>
                                  <p className="text-sm text-gray-500 mt-0.5">
                                    {new Date(order.createdAt).toLocaleDateString('pt-BR', {
                                      day: '2-digit', month: 'long', year: 'numeric',
                                    })}
                                  </p>
                                </div>
                                <span className={`px-3 py-1 rounded-sm text-xs font-bold uppercase tracking-wide ${statusBadgeClass(order.status)}`}>
                                  {statusToPt(order.status)}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-3 justify-between items-center pt-3 border-t border-gray-100">
                                <p className="text-xl font-bold text-[#CC1020]">
                                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total)}
                                </p>
                                <div className="flex gap-2 flex-wrap">
                                  {order.status === 'PENDING' && (
                                    <Button size="sm" asChild>
                                      <a href={`/pagamento/${order.id}`}>Pagar Agora</a>
                                    </Button>
                                  )}
                                  {order.status !== 'PENDING' && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleReorder(order.id)}
                                      disabled={reorderingId === order.id}
                                    >
                                      {reorderingId === order.id ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                                      ) : (
                                        <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                                      )}
                                      Comprar de novo
                                    </Button>
                                  )}
                                  <Button variant="outline" size="sm" asChild>
                                    <a href={`/minha-conta/pedidos/${order.id}`}>Ver Detalhes</a>
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── ENDEREÇOS ───────────────────────────────────────── */}
                  {activeTab === 'enderecos' && (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="w-1 h-6 bg-[#CC1020] rounded-full" />
                          <h2 className="font-display text-xl font-bold text-[#1A1A1A] uppercase">
                            Endereços de Entrega
                          </h2>
                        </div>
                        <Button size="sm">Adicionar Endereço</Button>
                      </div>
                      <div className="text-center py-12">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <MapPin className="h-10 w-10 text-gray-400" />
                        </div>
                        <p className="font-display text-lg font-bold text-[#1A1A1A] uppercase mb-1">
                          Nenhum endereço cadastrado
                        </p>
                        <p className="text-sm text-gray-500">
                          Adicione um endereço para agilizar futuros pedidos.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* ── DEVOLUÇÕES ──────────────────────────────────────── */}
                  {activeTab === 'devolucoes' && (
                    <div className="space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="w-1 h-6 bg-[#CC1020] rounded-full" />
                        <h2 className="font-display text-xl font-bold text-[#1A1A1A] uppercase">
                          Minhas Devoluções
                        </h2>
                      </div>
                      <div className="text-center py-12">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <RotateCcw className="h-10 w-10 text-gray-400" />
                        </div>
                        <p className="font-display text-lg font-bold text-[#1A1A1A] uppercase mb-1">
                          Nenhuma devolução
                        </p>
                        <p className="text-sm text-gray-500 mb-6">
                          Gerencie suas solicitações de devolução aqui.
                        </p>
                        <Button asChild variant="outline">
                          <a href="/minha-conta/devolucoes">Ver Devoluções</a>
                        </Button>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
      <Footer />
    </>
  );
}
