'use client';

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Edit, Trash2, Search, X, Check, Package } from "lucide-react";

type Brand = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  isActive: boolean;
  _count: { products: number };
};

const emptyForm = { name: "", slug: "", description: "", logoUrl: "", isActive: true };

function toSlug(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

export default function MarcasPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [search, setSearch] = useState("");

  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchBrands = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(pagination.page), limit: String(pagination.limit) });
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/brands?${params}`);
      const data = await res.json();
      setBrands(data.brands || []);
      if (data.pagination) setPagination(data.pagination);
    } catch {
      toast.error("Erro ao carregar marcas");
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search]);

  useEffect(() => { fetchBrands(); }, [fetchBrands]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const method = editingId ? "PUT" : "POST";
      const body = editingId ? { ...form, id: editingId } : form;
      const res = await fetch("/api/admin/brands", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Erro");
      }
      toast.success(editingId ? "Marca atualizada" : "Marca criada");
      setForm(emptyForm);
      setEditingId(null);
      fetchBrands();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar marca");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (brand: Brand) => {
    setEditingId(brand.id);
    setForm({
      name: brand.name,
      slug: brand.slug,
      description: brand.description || "",
      logoUrl: brand.logoUrl || "",
      isActive: brand.isActive,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deseja excluir a marca "${name}"?`)) return;
    try {
      const res = await fetch(`/api/admin/brands?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Erro");
      }
      toast.success("Marca excluída");
      fetchBrands();
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir marca");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Marcas</h1>
        <p className="text-sm text-gray-500">Marcas dos produtos (incluindo as importadas do Hiper)</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Formulário */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold mb-4">{editingId ? "Editar Marca" : "Nova Marca"}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm({
                    ...form,
                    name: e.target.value,
                    slug: form.slug ? form.slug : toSlug(e.target.value),
                  })
                }
                placeholder="Ex: Bosch, Makita, DeWalt"
                required
              />
            </div>

            <div>
              <Label>Slug *</Label>
              <Input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: toSlug(e.target.value) })}
                placeholder="bosch"
                required
              />
            </div>

            <div>
              <Label>Descrição</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Descrição da marca"
              />
            </div>

            <div>
              <Label>URL do Logo</Label>
              <Input
                value={form.logoUrl}
                onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="isActive">Ativa</Label>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Salvando..." : editingId ? "Salvar" : "Criar Marca"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={editingId ? handleCancelEdit : () => setForm(emptyForm)}
              >
                {editingId ? <><X className="h-4 w-4 mr-1" />Cancelar</> : "Limpar"}
              </Button>
            </div>
          </form>
        </div>

        {/* Lista */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-4 rounded-lg shadow-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  className="pl-9"
                  placeholder="Buscar por nome ou slug..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchBrands()}
                />
              </div>
              <Button onClick={() => { setPagination((p) => ({ ...p, page: 1 })); fetchBrands(); }}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-sm text-gray-500 whitespace-nowrap">{pagination.total} marcas</div>
          </div>

          {loading ? (
            <div className="bg-white p-8 rounded-lg shadow-sm flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
            </div>
          ) : brands.length === 0 ? (
            <div className="bg-white p-8 rounded-lg shadow-sm text-center text-gray-500">
              <Package className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p>Nenhuma marca encontrada.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {brands.map((brand) => (
                <div
                  key={brand.id}
                  className={`bg-white p-4 rounded-lg shadow-sm flex items-center justify-between gap-4 ${editingId === brand.id ? 'ring-2 ring-primary-500' : ''}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {brand.logoUrl ? (
                      <img src={brand.logoUrl} alt={brand.name} className="h-10 w-10 object-contain rounded border" />
                    ) : (
                      <div className="h-10 w-10 rounded border bg-gray-100 flex items-center justify-center text-gray-400 text-xs font-bold">
                        {brand.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-medium flex items-center gap-2">
                        {brand.name}
                        {brand.isActive ? (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Ativa</span>
                        ) : (
                          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inativa</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 truncate">/{brand.slug}</div>
                      {brand.description && (
                        <div className="text-xs text-gray-400 truncate">{brand.description}</div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm text-gray-500">{brand._count.products} produto(s)</span>
                    <Button size="sm" variant="outline" onClick={() => handleEdit(brand)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(brand.id, brand.name)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mt-2">
            <div className="text-sm text-gray-500">
              {pagination.total > 0
                ? `Mostrando ${(pagination.page - 1) * pagination.limit + 1}–${Math.min(pagination.page * pagination.limit, pagination.total)} de ${pagination.total}`
                : '0 marcas'}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
                disabled={pagination.page === 1}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagination((p) => ({ ...p, page: Math.min(p.totalPages, p.page + 1) }))}
                disabled={pagination.page >= pagination.totalPages}
              >
                Próxima
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
