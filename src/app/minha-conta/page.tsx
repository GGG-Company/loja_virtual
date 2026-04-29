'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Package, MapPin, RotateCcw, Loader2, Check, RefreshCw, Lock, Download, Shield, MessageCircle, Trash2 } from 'lucide-react';
import { SupportChatTab } from '@/components/support-chat-tab';
import { apiClient } from '@/lib/api-client';
import { statusToPt, statusBadgeClass } from '@/lib/i18n';
import { toast } from 'sonner';

type ProfileData = {
  name: string;
  email: string;
  phone: string;
  cpf: string;
  addressZip: string;
  addressStreet: string;
  addressNumber: string;
  addressComplement: string;
  addressNeighborhood: string;
  addressCity: string;
  addressState: string;
};
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

type ReturnItem = {
  id: string;
  returnNumber: string;
  status: string;
  reason: string;
  createdAt: string;
  refundAmount?: number;
};

const returnStatusLabels: Record<string, { label: string; color: string }> = {
  REQUESTED: { label: 'Solicitado', color: 'bg-blue-100 text-blue-800' },
  PENDING_REVIEW: { label: 'Em Análise', color: 'bg-yellow-100 text-yellow-800' },
  APPROVED: { label: 'Aprovado', color: 'bg-green-100 text-green-800' },
  LABEL_GENERATED: { label: 'Etiqueta Gerada', color: 'bg-purple-100 text-purple-800' },
  IN_TRANSIT: { label: 'Em Trânsito', color: 'bg-blue-100 text-blue-800' },
  RECEIVED: { label: 'Recebido', color: 'bg-indigo-100 text-indigo-800' },
  INSPECTING: { label: 'Em Inspeção', color: 'bg-orange-100 text-orange-800' },
  REFUND_PENDING: { label: 'Reembolso Pendente', color: 'bg-yellow-100 text-yellow-800' },
  REFUNDED: { label: 'Reembolsado', color: 'bg-green-100 text-green-800' },
  REJECTED: { label: 'Rejeitado', color: 'bg-red-100 text-red-800' },
  CANCELLED: { label: 'Cancelado', color: 'bg-gray-100 text-gray-800' },
};

const reasonLabels: Record<string, string> = {
  DEFECTIVE: 'Produto com defeito',
  WRONG_PRODUCT: 'Produto errado',
  NOT_AS_DESCRIBED: 'Diferente do anunciado',
  DAMAGED_SHIPPING: 'Danificado no transporte',
  CHANGED_MIND: 'Arrependimento',
  SIZE_ISSUE: 'Tamanho incorreto',
  OTHER: 'Outro motivo',
};

function formatCpf(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : '';
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function formatCep(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}
type ProfileForm = {
  name: string;
  phone: string;
  cpf: string;
};

export default function MyAccountPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'perfil' | 'pedidos' | 'devolucoes' | 'enderecos' | 'suporte'>('perfil');

  // Profile state
  const [profile, setProfile] = useState<ProfileData>({
    name: '', email: '', phone: '', cpf: '',
    addressZip: '', addressStreet: '', addressNumber: '',
    addressComplement: '', addressNeighborhood: '', addressCity: '', addressState: '',
  });
  const [profileLoading, setProfileLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Orders state
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [reorderingId, setReorderingId] = useState<string | null>(null);

  // ── Profile form state ────────────────────────────────────────────────────
  // const [profile, setProfile] = useState<ProfileForm>({ name: '', phone: '', cpf: '' });
  // const [profileSaving, setProfileSaving] = useState(false);
  // const [profileSaved, setProfileSaved] = useState(false);

  // Returns state
  const [returns, setReturns] = useState<ReturnItem[]>([]);
  const [returnsLoading, setReturnsLoading] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);

  // Address CEP lookup
  const [cepLoading, setCepLoading] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [confirmDeleteInput, setConfirmDeleteInput] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/login');
  }, [status, router]);

  // Load profile on mount
  useEffect(() => {
    if (status === 'authenticated') {
      fetchProfile();
    }
  }, [status]);

  // Pre-populate from session
  useEffect(() => {
    if (session?.user) {
      setProfile((prev) => ({
        ...prev,
        name: prev.name || session.user.name || '',
      }));
    }
    if (activeTab === 'devolucoes') {
      fetchReturns();
    }
  }, [activeTab]);

  const fetchProfile = async () => {
    try {
      setProfileLoading(true);
      const response = await apiClient.get('/api/profile');
      const data = response.data;
      setHasPassword(!!data.hasPassword);
      setProfile({
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        cpf: data.cpf || '',
        addressZip: data.addressZip || '',
        addressStreet: data.addressStreet || '',
        addressNumber: data.addressNumber || '',
        addressComplement: data.addressComplement || '',
        addressNeighborhood: data.addressNeighborhood || '',
        addressCity: data.addressCity || '',
        addressState: data.addressState || '',
      });
    } catch {
      toast.error('Erro ao carregar perfil');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile.name.trim() || profile.name.trim().length < 3) {
      toast.error('Nome deve ter no mínimo 3 caracteres');
      return;
    }
    const cpfDigits = profile.cpf.replace(/\D/g, '');
    if (cpfDigits && cpfDigits.length !== 11) {
      toast.error('CPF deve ter 11 dígitos');
      return;
    }
    try {
      setSaving(true);
      await apiClient.put('/api/profile', {
        name: profile.name.trim(),
        phone: profile.phone.replace(/\D/g, '') || null,
        cpf: cpfDigits || null,
        addressZip: profile.addressZip.replace(/\D/g, '') || null,
        addressStreet: profile.addressStreet || null,
        addressNumber: profile.addressNumber || null,
        addressComplement: profile.addressComplement || null,
        addressNeighborhood: profile.addressNeighborhood || null,
        addressCity: profile.addressCity || null,
        addressState: profile.addressState || null,
      });
      toast.success('Perfil atualizado com sucesso!');
    } catch {
      toast.error('Erro ao salvar perfil');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword) {
      toast.error('Digite a senha atual');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Nova senha deve ter no mínimo 8 caracteres');
      return;
    }
    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      toast.error('Nova senha deve conter maiúscula, minúscula e número');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }
    try {
      setChangingPassword(true);
      await apiClient.post('/api/auth/change-password', {
        currentPassword,
        newPassword,
      });
      toast.success('Senha alterada com sucesso!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Erro ao alterar senha';
      toast.error(msg);
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (confirmDeleteInput !== 'EXCLUIR') {
      toast.error('Digite EXCLUIR para confirmar');
      return;
    }
    setDeletingAccount(true);
    try {
      const res = await fetch('/api/user/account', { method: 'DELETE' });
      if (res.ok) {
        toast.success('Conta removida. Redirecionando…');
        setTimeout(() => { window.location.href = '/'; }, 2000);
      } else {
        const data = await res.json();
        toast.error(data?.error || 'Erro ao excluir conta');
      }
    } catch {
      toast.error('Erro ao excluir conta');
    } finally {
      setDeletingAccount(false);
    }
  };

  const fetchReturns = async () => {
    try {
      setReturnsLoading(true);
      const response = await apiClient.get('/api/returns');
      setReturns(response.data.returns || response.data || []);
    } catch {
      toast.error('Erro ao carregar devoluções');
    } finally {
      setReturnsLoading(false);
    }
  };

  const lookupCep = async (cep: string) => {
    const digits = cep.replace(/\D/g, '');
    if (digits.length !== 8) return;
    try {
      setCepLoading(true);
      const res = await fetch(`/api/cep/${digits}`);
      const data = await res.json();
      if (data.erro) {
        toast.error('CEP não encontrado');
        return;
      }
      setProfile(prev => ({
        ...prev,
        addressStreet: data.logradouro || prev.addressStreet,
        addressNeighborhood: data.bairro || prev.addressNeighborhood,
        addressCity: data.localidade || prev.addressCity,
        addressState: data.uf || prev.addressState,
      }));
    } catch {
      toast.error('Erro ao buscar CEP');
    } finally {
      setCepLoading(false);
    }
  };

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
    { id: 'suporte' as const, label: 'Suporte', icon: MessageCircle },
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
                    <div className="space-y-8">
                      <h2 className="text-2xl font-bold text-metallic-900">
                        Informações Pessoais
                      </h2>

                      {profileLoading ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
                        </div>
                      ) : (
                        <>
                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="name">Nome Completo</Label>
                              <Input
                                id="name"
                                value={profile.name}
                                onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                                className="h-12"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="email">Email</Label>
                              <Input
                                id="email"
                                type="email"
                                value={profile.email}
                                disabled
                                className="h-12 bg-metallic-50"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="phone">Telefone</Label>
                              <Input
                                id="phone"
                                type="tel"
                                value={formatPhone(profile.phone)}
                                onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                                placeholder="(75) 99999-0000"
                                className="h-12"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="cpf">CPF</Label>
                              <Input
                                id="cpf"
                                value={formatCpf(profile.cpf)}
                                onChange={(e) => setProfile(prev => ({ ...prev, cpf: e.target.value }))}
                                placeholder="000.000.000-00"
                                className="h-12"
                              />
                            </div>
                          </div>

                          <Button
                            className="h-12 px-8"
                            onClick={handleSaveProfile}
                            disabled={saving}
                          >
                            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            Salvar Alterações
                          </Button>

                          {/* Senha Atual - apenas visual
                          {hasPassword && (
                            <div className="space-y-2 mt-4">
                              <Label>Senha Atual</Label>
                              <div className="flex w-full rounded-md border border-input bg-metallic-50 px-3 py-2 text-sm h-12 items-center text-metallic-400 select-none pointer-events-none">
                                ●●●●●●●●
                              </div>
                            </div>
                          )} */}

                          {/* Privacidade e Dados — LGPD */}
                          <div className="border-t pt-8">
                            <div className="flex items-center gap-3 mb-4">
                              <Shield className="h-5 w-5 text-[#CC1020]" />
                              <h3 className="font-semibold text-lg">Privacidade e Seus Dados</h3>
                            </div>
                            <p className="text-sm text-gray-500 mb-4">
                              De acordo com a LGPD (Lei 13.709/18), você pode exportar todos os seus dados
                              pessoais armazenados em nossos servidores em formato JSON.
                            </p>
                            <Button
                              variant="outline"
                              className="gap-2"
                              onClick={() => {
                                window.location.href = '/api/user/export';
                              }}
                            >
                              <Download className="h-4 w-4" />
                              Exportar Meus Dados
                            </Button>
                            <p className="text-xs text-gray-400 mt-2">
                              O arquivo inclui perfil, pedidos, devoluções, avaliações e histórico de atividade.
                            </p>
                          </div>

                          {/* Excluir Conta — LGPD Art. 18 */}
                          <div className="border-t pt-8">
                            <div className="flex items-center gap-3 mb-3">
                              <Trash2 className="h-5 w-5 text-red-600" />
                              <h3 className="font-semibold text-lg text-red-600">Excluir Minha Conta</h3>
                            </div>
                            <p className="text-sm text-gray-500 mb-4">
                              Ao excluir sua conta, seus dados pessoais serão anonimizados (LGPD Art. 18).
                              Pedidos e histórico financeiro são preservados sem identificação pessoal.
                              <strong className="text-red-600"> Esta ação é irreversível.</strong>
                            </p>
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3 max-w-md">
                              <p className="text-sm font-medium text-red-800">
                                Digite <span className="font-mono font-bold">EXCLUIR</span> para confirmar:
                              </p>
                              <input
                                type="text"
                                value={confirmDeleteInput}
                                onChange={(e) => setConfirmDeleteInput(e.target.value)}
                                placeholder="EXCLUIR"
                                className="w-full rounded-md border border-red-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                              />
                              <Button
                                variant="outline"
                                className="gap-2 border-red-500 text-red-600 hover:bg-red-50 w-full"
                                disabled={deletingAccount || confirmDeleteInput !== 'EXCLUIR'}
                                onClick={handleDeleteAccount}
                              >
                                {deletingAccount ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                {deletingAccount ? 'Excluindo…' : 'Excluir minha conta permanentemente'}
                              </Button>
                            </div>
                          </div>

                          {/* Alterar Senha */}
                          <div className="border-t pt-8">
                            <button
                              type="button"
                              onClick={() => {
                                if (!showPasswordSection) {
                                  setCurrentPassword('');
                                  setNewPassword('');
                                  setConfirmPassword('');
                                }
                                setShowPasswordSection(!showPasswordSection);
                              }}
                              className="flex items-center gap-2 text-xl font-bold text-metallic-900 hover:text-primary-600 transition-colors"
                            >
                              <Lock className="h-5 w-5" />
                              Alterar Senha
                              <span className="text-sm font-normal text-metallic-500">
                                {showPasswordSection ? '▲' : '▼'}
                              </span>
                            </button>

                            {showPasswordSection && (
                              <>
                                {/* Hidden trap inputs to capture browser autofill */}
                                <input type="text" name="trap-user" style={{ display: 'none' }} tabIndex={-1} />
                                <input type="password" name="trap-pass" style={{ display: 'none' }} tabIndex={-1} />
                                <div className="grid md:grid-cols-2 gap-4 max-w-xl mt-4">
                                  <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="pw-cur">Digite sua senha atual</Label>
                                    <input
                                      id="pw-cur"
                                      name="pw-cur"
                                      type="text"
                                      value={currentPassword}
                                      onChange={(e) => setCurrentPassword(e.target.value)}
                                      autoComplete="off"
                                      style={{ WebkitTextSecurity: 'disc' } as React.CSSProperties}
                                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background h-12 password-mask"
                                    />
                                  </div>

                                  <div className="space-y-2">
                                    <Label htmlFor="pw-new">Nova Senha</Label>
                                    <input
                                      id="pw-new"
                                      name="pw-new"
                                      type="text"
                                      value={newPassword}
                                      onChange={(e) => setNewPassword(e.target.value)}
                                      autoComplete="off"
                                      style={{ WebkitTextSecurity: 'disc' } as React.CSSProperties}
                                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background h-12 password-mask"
                                    />
                                    <p className="text-xs text-metallic-500">Mínimo 8 caracteres, com maiúscula, minúscula e número</p>
                                  </div>

                                  <div className="space-y-2">
                                    <Label htmlFor="pw-conf">Confirmar Nova Senha</Label>
                                    <input
                                      id="pw-conf"
                                      name="pw-conf"
                                      type="text"
                                      value={confirmPassword}
                                      onChange={(e) => setConfirmPassword(e.target.value)}
                                      autoComplete="off"
                                      style={{ WebkitTextSecurity: 'disc' } as React.CSSProperties}
                                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background h-12 password-mask"
                                    />
                                  </div>
                                </div>

                                <Button
                                  className="h-12 px-8 mt-4"
                                  onClick={handleChangePassword}
                                  disabled={changingPassword}
                                  variant="outline"
                                >
                                  {changingPassword && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                  Alterar Senha
                                </Button>
                              </>
                            )}
                          </div>
                        </>
                      )}
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
                      <h2 className="text-2xl font-bold text-metallic-900">
                        Endereço de Entrega
                      </h2>

                      {profileLoading ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
                        </div>
                      ) : (
                        <>
                          <div className="grid md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="cep">CEP</Label>
                              <div className="flex gap-2">
                                <Input
                                  id="cep"
                                  value={formatCep(profile.addressZip)}
                                  onChange={(e) => setProfile(prev => ({ ...prev, addressZip: e.target.value }))}
                                  onBlur={(e) => lookupCep(e.target.value)}
                                  placeholder="00000-000"
                                  className="h-12"
                                />
                                {cepLoading && <Loader2 className="h-5 w-5 animate-spin text-primary-600 self-center" />}
                              </div>
                            </div>

                            <div className="space-y-2 md:col-span-2">
                              <Label htmlFor="street">Rua</Label>
                              <Input
                                id="street"
                                value={profile.addressStreet}
                                onChange={(e) => setProfile(prev => ({ ...prev, addressStreet: e.target.value }))}
                                placeholder="Nome da rua"
                                className="h-12"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="number">Número</Label>
                              <Input
                                id="number"
                                value={profile.addressNumber}
                                onChange={(e) => setProfile(prev => ({ ...prev, addressNumber: e.target.value }))}
                                placeholder="Nº"
                                className="h-12"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="complement">Complemento</Label>
                              <Input
                                id="complement"
                                value={profile.addressComplement}
                                onChange={(e) => setProfile(prev => ({ ...prev, addressComplement: e.target.value }))}
                                placeholder="Apto, Bloco..."
                                className="h-12"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="neighborhood">Bairro</Label>
                              <Input
                                id="neighborhood"
                                value={profile.addressNeighborhood}
                                onChange={(e) => setProfile(prev => ({ ...prev, addressNeighborhood: e.target.value }))}
                                placeholder="Bairro"
                                className="h-12"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="city">Cidade</Label>
                              <Input
                                id="city"
                                value={profile.addressCity}
                                onChange={(e) => setProfile(prev => ({ ...prev, addressCity: e.target.value }))}
                                placeholder="Cidade"
                                className="h-12"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="state">Estado</Label>
                              <Input
                                id="state"
                                value={profile.addressState}
                                onChange={(e) => setProfile(prev => ({ ...prev, addressState: e.target.value.toUpperCase().slice(0, 2) }))}
                                placeholder="UF"
                                maxLength={2}
                                className="h-12"
                              />
                            </div>
                          </div>

                          <Button
                            className="h-12 px-8"
                            onClick={handleSaveProfile}
                            disabled={saving}
                          >
                            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            Salvar Endereço
                          </Button>
                        </>
                      )}
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

                      {returnsLoading ? (
                        <div role="status" aria-label="Carregando devoluções..." className="flex items-center justify-center py-12">
                          <Loader2 className="h-8 w-8 animate-spin text-primary-600" aria-hidden="true" />
                        </div>
                      ) : returns.length === 0 ? (
                        <div className="text-center py-12">
                          <RotateCcw className="h-16 w-16 text-metallic-300 mx-auto mb-4" aria-hidden="true" />
                          <p className="text-metallic-600 mb-4">
                            Você não possui devoluções
                          </p>
                          <Button asChild>
                            <Link href="/minha-conta/pedidos">Ver Pedidos</Link>
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {returns.map((ret) => {
                            const statusInfo = returnStatusLabels[ret.status] || { label: ret.status, color: 'bg-gray-100 text-gray-800' };
                            return (
                              <div
                                key={ret.id}
                                className="border border-metallic-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <div>
                                    <p className="font-semibold text-lg">
                                      Devolução #{ret.returnNumber}
                                    </p>
                                    <p className="text-sm text-metallic-600">
                                      {new Date(ret.createdAt).toLocaleDateString('pt-BR')}
                                    </p>
                                    <p className="text-sm text-metallic-500 mt-1">
                                      {reasonLabels[ret.reason] || ret.reason}
                                    </p>
                                  </div>
                                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}>
                                    {statusInfo.label}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center mt-4">
                                  {ret.refundAmount && (
                                    <p className="text-lg font-bold text-primary-600">
                                      Reembolso: R$ {Number(ret.refundAmount).toFixed(2)}
                                    </p>
                                  )}
                                  <Button variant="outline" size="sm" asChild>
                                    <a href="/minha-conta/devolucoes">Ver Detalhes</a>
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── SUPORTE ─────────────────────────────────────────── */}
                  {activeTab === 'suporte' && <SupportChatTab />}

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
