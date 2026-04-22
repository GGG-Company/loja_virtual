'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, Trash2, Link2, Link2Off, Search, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import Image from "next/image";

interface HiperProduct {
  id: string;
  nome: string;
  codigo: number;
  codigoDeBarras: string;
  preco: number;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  categoryId: string;
  brandId?: string | null;
  ean?: string | null;
  status: string;
  isFeatured: boolean;
  isPromo: boolean;
  stockLocation?: string | null;
  slug?: string;
  imageUrl?: string | null;
  externalIdHiper?: string | null;
  category?: { name?: string } | null;
  brand?: { id: string; name: string } | null;
}

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params?.id as string;

  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [product,       setProduct]       = useState<Product | null>(null);
  const [categories,    setCategories]    = useState<{ id: string; name: string }[]>([]);
  const [brands,        setBrands]        = useState<{ id: string; name: string }[]>([]);
  const [hiperProducts, setHiperProducts] = useState<HiperProduct[]>([]);
  const [hiperSearch,   setHiperSearch]   = useState('');
  const [hiperLinked,   setHiperLinked]   = useState<string | null>(null);
  const [hiperSelected, setHiperSelected] = useState<string>('');
  const [linkingSaving, setLinkingSaving] = useState(false);
  const [imagePreview,  setImagePreview]  = useState<string>("/placeholder.svg");
  const [showPreview,   setShowPreview]   = useState(false);
  const [slug,          setSlug]          = useState("");
  const [newBrandName,  setNewBrandName]  = useState('');
  const [creatingBrand, setCreatingBrand] = useState(false);
  const [savingBrand,   setSavingBrand]   = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    promotionalPrice: "",
    stock: "",
    categoryId: "",
    brandId: "",
    ean: "",
    status: "ACTIVE",
    imageUrl: "",
    isFeatured: false,
    isPromo: false,
    stockLocation: "",
  });

  useEffect(() => {
    fetch('/api/admin/integrations/hiper/products')
      .then((r) => r.json())
      .then((d) => setHiperProducts(d.products ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories || []))
      .catch(() => {});
    fetch("/api/admin/brands")
      .then((r) => r.json())
      .then((d) => setBrands(d.brands || []))
      .catch(() => {});

    if (productId) {
      fetch(`/api/admin/products/${productId}`)
        .then((r) => r.json())
        .then((data) => {
          setProduct(data);
          setSlug(data.slug || productId);
          setHiperLinked(data.externalIdHiper ?? null);
          setHiperSelected(data.externalIdHiper ?? '');
          setFormData({
            name: data.name,
            description: data.description,
            price: data.price.toString(),
            promotionalPrice: data.promotionalPrice?.toString() || "",
            stock: data.stock.toString(),
            categoryId: data.categoryId,
            brandId: data.brand?.id || data.brandId || "",
            ean: data.ean || "",
            status: data.status,
            imageUrl: data.imageUrl || "",
            isFeatured: data.isFeatured || false,
            isPromo: data.isPromo || false,
            stockLocation: data.stockLocation || "",
          });
          setImagePreview(data.imageUrl || "/placeholder.svg");
          setLoading(false);
        })
        .catch(() => {
          toast.error("Erro ao carregar produto");
          setLoading(false);
        });
    }
  }, [productId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const imageToSend = formData.imageUrl?.trim() || null;
    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          price: parseFloat(formData.price),
          promotionalPrice: formData.promotionalPrice ? parseFloat(formData.promotionalPrice) : null,
          stock: parseInt(formData.stock),
          imageUrl: imageToSend,
          stockLocation: formData.stockLocation || null,
          brandId: formData.brandId || null,
          ean: formData.ean || null,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Produto atualizado com sucesso!");
      router.push("/admin/products");
    } catch {
      toast.error("Erro ao atualizar produto");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveImage = () => {
    setImagePreview("/placeholder.svg");
    setFormData((prev) => ({ ...prev, imageUrl: "" }));
  };

  const handleDelete = async () => {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;
    try {
      const res = await fetch(`/api/admin/products/${productId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Produto excluído!");
      router.push("/admin/products");
    } catch {
      toast.error("Erro ao excluir produto");
    }
  };

  const handleSaveHiperLink = async (hiperProductId: string | null) => {
    setLinkingSaving(true);
    try {
      const res = await fetch(`/api/admin/integrations/hiper/link/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hiperProductId }),
      });
      if (!res.ok) throw new Error();
      setHiperLinked(hiperProductId);
      setHiperSelected(hiperProductId ?? '');
      toast.success(hiperProductId ? 'Produto vinculado ao Hiper' : 'Vínculo removido');
    } catch {
      toast.error('Erro ao salvar vínculo');
    } finally {
      setLinkingSaving(false);
    }
  };

  const hiperFiltered = hiperProducts.filter(
    (h) => !hiperSearch ||
      h.nome.toLowerCase().includes(hiperSearch.toLowerCase()) ||
      String(h.codigo).includes(hiperSearch) ||
      h.codigoDeBarras.includes(hiperSearch),
  );
  const linkedHiperProduct = hiperProducts.find((h) => h.id === hiperLinked);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCreateBrand = async () => {
    const name = newBrandName.trim();
    if (!name) return;
    setSavingBrand(true);
    try {
      const res = await fetch('/api/admin/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Erro ao criar marca'); return; }
      const brand = data.brand;
      setBrands((prev) => [...prev, { id: brand.id, name: brand.name }].sort((a, b) => a.name.localeCompare(b.name)));
      setFormData((prev) => ({ ...prev, brandId: brand.id }));
      setNewBrandName('');
      setCreatingBrand(false);
      toast.success(`Marca "${brand.name}" criada`);
    } catch {
      toast.error('Erro ao criar marca');
    } finally {
      setSavingBrand(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Imagem muito grande. Máximo 2MB"); return; }
    const reader = new FileReader();
    reader.onloadend = () => {
      const b64 = reader.result as string;
      setImagePreview(b64);
      setFormData((prev) => ({ ...prev, imageUrl: b64 }));
    };
    reader.readAsDataURL(file);
  };

  const selectClass = "w-full h-10 rounded-lg border border-gray-300 px-3 text-sm shadow-sm bg-white font-sans text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-100";

  if (loading) return <div className="container mx-auto p-6 text-gray-500">Carregando produto...</div>;
  if (!product) return <div className="container mx-auto p-6 text-gray-500">Produto não encontrado</div>;

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Link href="/admin/products" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para produtos
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">Editar Produto</h1>
            {slug && (
              <a href={`/produtos/${slug}`} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-primary-600 mt-1">
                <ExternalLink className="h-3.5 w-3.5" />
                /produtos/{slug}
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Imagem */}
          <div>
            <Label>Imagem do Produto</Label>
            <div className="mt-2 flex items-center gap-4">
              <div className="relative w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden group shrink-0">
                <Image src={imagePreview} alt="Preview" fill sizes="128px" className="object-cover" />
                <button type="button" onClick={handleRemoveImage}
                  className="absolute top-2 right-2 hidden group-hover:flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 text-xs text-white">
                  <Trash2 className="h-3 w-3" />Remover
                </button>
              </div>
              <div className="flex-1">
                <Input id="image" type="file" accept="image/*" onChange={handleImageChange} className="cursor-pointer" />
                <p className="text-xs text-gray-500 mt-1">PNG, JPG ou WEBP (máx. 2MB)</p>
              </div>
            </div>
          </div>

          {/* Nome */}
          <div>
            <Label htmlFor="name">Nome do Produto *</Label>
            <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
          </div>

          {/* Descrição */}
          <div>
            <Label htmlFor="description">Descrição *</Label>
            <textarea id="description" name="description" value={formData.description} onChange={handleChange} required rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" />
            <div className="mt-2 flex justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowPreview(true)}>
                <ExternalLink className="h-4 w-4 mr-1.5" />Visualizar como cliente
              </Button>
            </div>
          </div>

          {/* Preços */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price">Preço Normal (R$) *</Label>
              <Input id="price" name="price" type="number" step="0.01" value={formData.price} onChange={handleChange} required />
            </div>
            <div>
              <Label htmlFor="promotionalPrice">Preço Promocional (R$)</Label>
              <Input id="promotionalPrice" name="promotionalPrice" type="number" step="0.01" value={formData.promotionalPrice} onChange={handleChange} placeholder="Opcional" />
              <p className="text-xs text-gray-500 mt-1">Deixe vazio se não houver promoção</p>
            </div>
          </div>

          {/* Estoque (read-only) + EAN */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="stock">Estoque</Label>
              <Input id="stock" name="stock" type="number" value={formData.stock} disabled className="bg-gray-100 cursor-not-allowed" />
              <p className="text-xs text-gray-500 mt-1">Ajustado automaticamente por pedidos</p>
            </div>
            <div>
              <Label htmlFor="ean">EAN / Código de Barras</Label>
              <Input id="ean" name="ean" value={formData.ean} onChange={handleChange} placeholder="Ex: 7891234567890" />
              <p className="text-xs text-gray-500 mt-1">Usado para vincular com o Hiper</p>
            </div>
          </div>

          {/* Localização */}
          <div>
            <Label htmlFor="stockLocation">Localização no Estoque</Label>
            <Input id="stockLocation" name="stockLocation" value={formData.stockLocation} onChange={handleChange} placeholder="Ex.: Corredor B - Prateleira 4" />
          </div>

          {/* Categoria + Marca */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="categoryId">Categoria *</Label>
              <select id="categoryId" name="categoryId" value={formData.categoryId} onChange={handleChange} required className={selectClass}>
                <option value="">Selecione uma categoria</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label htmlFor="brandId">Marca</Label>
                <button type="button" onClick={() => setCreatingBrand((v) => !v)}
                  className="text-xs text-primary-600 hover:underline">
                  {creatingBrand ? 'Cancelar' : '+ Nova marca'}
                </button>
              </div>
              {creatingBrand ? (
                <div className="flex gap-2">
                  <input autoFocus value={newBrandName} onChange={(e) => setNewBrandName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateBrand(); } }}
                    placeholder="Nome da marca" className={selectClass} />
                  <button type="button" onClick={handleCreateBrand} disabled={savingBrand || !newBrandName.trim()}
                    className="shrink-0 px-3 rounded-lg bg-primary-600 text-white text-sm disabled:opacity-50 hover:bg-primary-700">
                    {savingBrand ? '...' : 'Criar'}
                  </button>
                </div>
              ) : (
                <select id="brandId" name="brandId" value={formData.brandId} onChange={handleChange} className={selectClass}>
                  <option value="">Sem marca</option>
                  {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              )}
            </div>
          </div>

          {/* Status */}
          <div>
            <Label htmlFor="status">Status</Label>
            <select id="status" name="status" value={formData.status} onChange={handleChange} className={selectClass}>
              <option value="ACTIVE">Ativo</option>
              <option value="INACTIVE">Inativo</option>
            </select>
          </div>

          {/* Destaques */}
          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={formData.isFeatured}
                onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                className="h-4 w-4 text-primary-600 border-gray-300 rounded" />
              <span className="text-sm">⭐ Produto em Destaque (aparece na home)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={formData.isPromo}
                onChange={(e) => setFormData({ ...formData, isPromo: e.target.checked })}
                className="h-4 w-4 text-primary-600 border-gray-300 rounded" />
              <span className="text-sm">🔥 Produto em Oferta (aparece na página de ofertas)</span>
            </label>
          </div>

          {/* Vínculo Hiper */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Vínculo com Hiper Gestão</Label>
              {hiperLinked ? (
                <span className="flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-1">
                  <Link2 className="w-3.5 h-3.5" />Vinculado
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded-full px-2.5 py-1">
                  <Link2Off className="w-3.5 h-3.5" />Não vinculado
                </span>
              )}
            </div>

            {linkedHiperProduct && (
              <div className="text-sm bg-green-50 border border-green-100 rounded-md px-3 py-2 text-green-800">
                <span className="font-medium">{linkedHiperProduct.nome}</span>
                <span className="text-green-600 ml-2">
                  (cód. {linkedHiperProduct.codigo}
                  {linkedHiperProduct.codigoDeBarras ? ` · EAN: ${linkedHiperProduct.codigoDeBarras}` : ''})
                </span>
              </div>
            )}

            {formData.ean && !hiperLinked && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded px-3 py-2">
                EAN <strong>{formData.ean}</strong> cadastrado. Na próxima sincronização do Hiper, o vínculo será feito automaticamente.
              </p>
            )}

            {hiperProducts.length === 0 ? (
              <p className="text-xs text-gray-400">Nenhum produto disponível no Hiper. Configure em Hiper Gestão → Vendas → Loja Virtual.</p>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                  <Input placeholder="Buscar por nome, código ou EAN..." value={hiperSearch}
                    onChange={(e) => setHiperSearch(e.target.value)} className="pl-8 text-sm" />
                </div>
                <select value={hiperSelected} onChange={(e) => setHiperSelected(e.target.value)}
                  className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm bg-white text-gray-900"
                  size={hiperFiltered.length > 0 ? Math.min(hiperFiltered.length + 1, 6) : 2}>
                  <option value="">— Nenhum (desvincular) —</option>
                  {hiperFiltered.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.nome} · cód. {h.codigo}{h.codigoDeBarras ? ` · ${h.codigoDeBarras}` : ''} · R$ {Number(h.preco).toFixed(2)}
                    </option>
                  ))}
                </select>
                <Button type="button" variant="outline" size="sm"
                  disabled={linkingSaving || hiperSelected === (hiperLinked ?? '')}
                  onClick={() => handleSaveHiperLink(hiperSelected || null)}>
                  {linkingSaving ? 'Salvando...' : hiperSelected ? 'Vincular ao produto selecionado' : 'Desvincular'}
                </Button>
              </div>
            )}
          </div>

          {/* Ações */}
          <div className="flex gap-4 pt-2">
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar Alterações"}</Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
            <Button type="button" variant="destructive" onClick={handleDelete} className="ml-auto">
              <Trash2 className="h-4 w-4 mr-2" />Excluir
            </Button>
          </div>
        </form>
      </div>

      {/* Modal de preview */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowPreview(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[90vh] mx-4 flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Pré-visualização do cliente</h2>
                <p className="text-xs text-gray-500">Salve antes para ver as últimas alterações.</p>
              </div>
              <Button variant="ghost" onClick={() => setShowPreview(false)}>Fechar</Button>
            </div>
            <div className="flex-1">
              {slug
                ? <iframe src={`/produtos/${slug}?embed=1`} title="Pré-visualização" className="w-full h-full border-0" />
                : <div className="h-full flex items-center justify-center text-gray-500 text-sm">Slug não disponível.</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
