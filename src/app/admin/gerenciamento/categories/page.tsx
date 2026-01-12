'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Edit, Trash2, Search } from 'lucide-react';

export default function GerenciamentoCategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');

  const [form, setForm] = useState({ name: '', slug: '', description: '', image: '' });
  const [creating, setCreating] = useState(false);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(pagination.page), limit: String(pagination.limit) });
      if (search) params.set('search', search);
      const res = await fetch(`/api/admin/categories?${params}`);
      const data = await res.json();
      setCategories(data.categories || []);
      if (data.pagination) setPagination(data.pagination);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar categorias');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCategories(); }, [pagination.page, pagination.limit]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch('/api/admin/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || 'Erro');
      }
      toast.success('Categoria criada');
      setForm({ name: '', slug: '', description: '', image: '' });
      fetchCategories();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao criar categoria');
    } finally { setCreating(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir esta categoria?')) return;
    try {
      const res = await fetch(`/api/admin/categories?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro');
      toast.success('Categoria deletada');
      fetchCategories();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao deletar categoria');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Categorias</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Nova Categoria</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: form.slug ? form.slug : e.target.value.toLowerCase().trim().replace(/[^a-z0-9\s-]/g,'').replace(/\s+/g,'-') })} required />
            </div>

            <div>
              <Label>Slug</Label>
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().trim().replace(/[^a-z0-9\s-]/g,'').replace(/\s+/g,'-') })} required />
            </div>

            <div>
              <Label>Descrição</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>

            <div>
              <Label>URL da imagem (opcional)</Label>
              <Input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} />
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={creating}>{creating ? 'Criando...' : 'Criar Categoria'}</Button>
              <Button variant="outline" onClick={() => setForm({ name: '', slug: '', description: '', image: '' })}>Limpar</Button>
            </div>
          </form>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white p-4 rounded-lg shadow-sm mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input className="pl-10" placeholder="Buscar por nome ou slug..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <Button onClick={() => { setPagination(prev => ({ ...prev, page: 1 })); fetchCategories(); }}><Search className="h-4 w-4"/></Button>
            </div>
            <div className="text-sm text-gray-500">{pagination.total} categorias</div>
          </div>

          <div className="space-y-3">
            {categories.map((c) => (
              <div key={c.id} className="bg-white p-4 rounded-lg shadow-sm flex items-center justify-between">
                <div>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-sm text-gray-500">/{c.slug}</div>
                  <div className="text-sm text-gray-400">{c.description}</div>
                </div>
                <div className="flex gap-2">
                  <Link href={`/admin/categories`}>
                    <Button size="sm" variant="outline"><Edit className="mr-1"/>Editar</Button>
                  </Link>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(c.id)}><Trash2 className="mr-1"/>Excluir</Button>
                </div>
              </div>
            ))}

            {categories.length === 0 && !loading && (
              <div className="bg-white p-6 rounded-lg text-center text-gray-500">Nenhuma categoria encontrada.</div>
            )}
          </div>

          {/* Paginação simples */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-500">Mostrando {(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total}</div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))} disabled={pagination.page === 1}>Anterior</Button>
              <Button variant="outline" onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))} disabled={pagination.page >= pagination.totalPages}>Próxima</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
