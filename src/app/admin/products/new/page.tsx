'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import Image from "next/image";

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [brands, setBrands] = useState<{ id: string; name: string }[]>([]);
  const [newBrandName, setNewBrandName] = useState('');
  const [creatingBrand, setCreatingBrand] = useState(false);
  const [savingBrand, setSavingBrand] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>("/placeholder.svg");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    promotionalPrice: "",
    stock: "",
    categoryId: "",
    brandId: "",
    ean: "",
    imageUrl: "",
    isFeatured: false,
    isPromo: false,
    stockLocation: "",
  });

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories || []))
      .catch(() => {});
    fetch("/api/admin/brands")
      .then((r) => r.json())
      .then((d) => setBrands(d.brands || []))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          price: parseFloat(formData.price),
          promotionalPrice: formData.promotionalPrice ? parseFloat(formData.promotionalPrice) : null,
          stock: parseInt(formData.stock),
          stockLocation: formData.stockLocation || null,
          brandId: formData.brandId || null,
          ean: formData.ean || null,
        }),
      });
      if (!res.ok) throw new Error("Erro ao criar produto");
      toast.success("Produto criado com sucesso!");
      router.push("/admin/products");
    } catch {
      toast.error("Erro ao criar produto");
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Link href="/admin/products" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para produtos
        </Link>
        <h1 className="text-3xl font-bold">Novo Produto</h1>
      </div>

      <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Imagem */}
          <div>
            <Label>Imagem do Produto</Label>
            <div className="mt-2 flex items-center gap-4">
              <div className="relative w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden shrink-0">
                <Image src={imagePreview} alt="Preview" fill sizes="128px" className="object-cover" />
              </div>
              <div className="flex-1">
                <Input id="image" name="image" type="file" accept="image/*" onChange={handleImageChange} className="cursor-pointer" />
                <p className="text-xs text-gray-500 mt-1">PNG, JPG ou WEBP (máx. 2MB)</p>
              </div>
            </div>
          </div>

          {/* Nome */}
          <div>
            <Label htmlFor="name">Nome do Produto *</Label>
            <Input id="name" name="name" value={formData.name} onChange={handleChange} required placeholder="Ex: Furadeira Bosch GSB 550" />
          </div>

          {/* Descrição */}
          <div>
            <Label htmlFor="description">Descrição *</Label>
            <textarea id="description" name="description" value={formData.description} onChange={handleChange} required rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Descrição detalhada do produto" />
          </div>

          {/* Preços */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price">Preço Normal (R$) *</Label>
              <Input id="price" name="price" type="number" step="0.01" value={formData.price} onChange={handleChange} required placeholder="0.00" />
            </div>
            <div>
              <Label htmlFor="promotionalPrice">Preço Promocional (R$)</Label>
              <Input id="promotionalPrice" name="promotionalPrice" type="number" step="0.01" value={formData.promotionalPrice} onChange={handleChange} placeholder="Opcional" />
              <p className="text-xs text-gray-500 mt-1">Deixe vazio se não houver promoção</p>
            </div>
          </div>

          {/* Estoque + EAN */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="stock">Estoque Inicial *</Label>
              <Input id="stock" name="stock" type="number" value={formData.stock} onChange={handleChange} required placeholder="0" />
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

          {/* Destaques */}
          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="isFeatured" checked={formData.isFeatured}
                onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                className="h-4 w-4 text-primary-600 border-gray-300 rounded" />
              <span className="text-sm">⭐ Produto em Destaque (aparece na home)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="isPromo" checked={formData.isPromo}
                onChange={(e) => setFormData({ ...formData, isPromo: e.target.checked })}
                className="h-4 w-4 text-primary-600 border-gray-300 rounded" />
              <span className="text-sm">🔥 Produto em Oferta (aparece na página de ofertas)</span>
            </label>
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={loading}>{loading ? "Criando..." : "Criar Produto"}</Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
