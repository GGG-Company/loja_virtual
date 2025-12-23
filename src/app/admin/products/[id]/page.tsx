'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  categoryId: string;
  status: string;
  slug?: string;
  imageUrl?: string | null;
  category?: { name?: string } | null;
}

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params?.id as string;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('/placeholder.svg');
  const [showPreview, setShowPreview] = useState(false);
  const [slug, setSlug] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    promotionalPrice: '',
    stock: '',
    categoryId: '',
    status: 'ACTIVE',
    imageUrl: '',
    isFeatured: false,
  });

  useEffect(() => {
    if (productId) {
      fetch(`/api/admin/products/${productId}`)
        .then((res) => res.json())
        .then((data) => {
          setProduct(data);
          setSlug(data.slug || productId);
          setFormData({
            name: data.name,
            description: data.description,
            price: data.price.toString(),
            promotionalPrice: data.promotionalPrice?.toString() || '',
            stock: data.stock.toString(),
            categoryId: data.categoryId,
            status: data.status,
            imageUrl: data.imageUrl || '',
            isFeatured: data.isFeatured || false,
          });
          setImagePreview(data.imageUrl || '/placeholder.svg');
          setLoading(false);
        })
        .catch((error) => {
          console.error('Erro ao carregar produto:', error);
          toast.error('Erro ao carregar produto');
          setLoading(false);
        });
    }
  }, [productId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const imageToSend = formData.imageUrl && formData.imageUrl.trim() !== '' ? formData.imageUrl : null;

    try {
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          price: parseFloat(formData.price),
          promotionalPrice: formData.promotionalPrice ? parseFloat(formData.promotionalPrice) : null,
          stock: parseInt(formData.stock),
          imageUrl: imageToSend,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao atualizar produto');
      }

      toast.success('Produto atualizado com sucesso!');
      router.push('/admin/products');
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao atualizar produto');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveImage = () => {
    setImagePreview('/placeholder.svg');
    setFormData((prev) => ({ ...prev, imageUrl: '' }));
  };

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Erro ao excluir produto');
      }

      toast.success('Produto excluído com sucesso!');
      router.push('/admin/products');
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao excluir produto');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Imagem muito grande. Máximo 2MB');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImagePreview(base64String);
        setFormData((prev) => ({ ...prev, imageUrl: base64String }));
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <p>Carregando produto...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto p-6">
        <p>Produto não encontrado</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Link href="/admin/products" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para produtos
        </Link>
        <h1 className="text-3xl font-bold">Editar Produto</h1>
      </div>

      <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="image">Imagem do Produto</Label>
            <div className="mt-2">
              <div className="flex items-center gap-4">
                <div className="relative w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden group">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 hidden group-hover:flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 text-xs text-white"
                    title="Remover imagem"
                  >
                    <Trash2 className="h-3 w-3" />
                    Remover
                  </button>
                </div>
                <div className="flex-1">
                  <Input
                    id="image"
                    name="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-gray-500 mt-1">PNG, JPG ou WEBP (máx. 2MB)</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="name">Nome do Produto</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Descrição</Label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <div className="mt-2 flex justify-end">
              <Button type="button" variant="outline" onClick={() => setShowPreview(true)}>
                Visualizar como cliente
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price">Preço Normal (R$)</Label>
              <Input
                id="price"
                name="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <Label htmlFor="promotionalPrice">Preço Promocional (R$)</Label>
              <Input
                id="promotionalPrice"
                name="promotionalPrice"
                type="number"
                step="0.01"
                value={formData.promotionalPrice}
                onChange={handleChange}
                placeholder="Opcional"
              />
              <p className="text-xs text-gray-500 mt-1">Deixe vazio se não houver promoção</p>
            </div>
          </div>

          <div>
            <Label htmlFor="stock">Estoque (somente leitura)</Label>
            <Input
              id="stock"
              name="stock"
              type="number"
              value={formData.stock}
              onChange={handleChange}
              disabled
              className="bg-gray-100 cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 mt-1">Estoque é ajustado automaticamente por pedidos e devoluções</p>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="isFeatured"
              name="isFeatured"
              type="checkbox"
              checked={formData.isFeatured}
              onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <Label htmlFor="isFeatured" className="cursor-pointer">
              ⭐ Produto em Destaque (aparece na home)
            </Label>
          </div>

          <div>
            <Label htmlFor="categoryId">Categoria</Label>
            <select
              id="categoryId"
              name="categoryId"
              value={formData.categoryId}
              onChange={handleChange}
              required
              className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm shadow-sm bg-white font-sans focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            >
              <option value="">Selecione uma categoria</option>
              <option value="1">Ferramentas Elétricas</option>
              <option value="2">Ferramentas Manuais</option>
              <option value="3">Jardinagem</option>
            </select>
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="ACTIVE">Ativo</option>
              <option value="INACTIVE">Inativo</option>
            </select>
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              className="ml-auto"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </Button>
          </div>
        </form>
      </div>

      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowPreview(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[90vh] mx-4 flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Pré-visualização do cliente</h2>
                <p className="text-xs text-gray-500">Mostrando a página real /produtos/{slug || productId}. Salve para ver mudanças persistidas.</p>
              </div>
              <Button variant="ghost" onClick={() => setShowPreview(false)}>Fechar</Button>
            </div>
            <div className="flex-1">
              {slug ? (
                <iframe
                  src={`/produtos/${slug}?embed=1`}
                  title="Pré-visualização do produto"
                  className="w-full h-full border-0"
                />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500 text-sm">
                  Não foi possível determinar o slug do produto.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
