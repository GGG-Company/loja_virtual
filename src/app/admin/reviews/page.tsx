'use client';

import { useEffect, useState } from 'react';
import { Star, Search, CheckCircle, XCircle, MessageSquare, Trash2, ChevronLeft, ChevronRight, Filter, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Review {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  isVerifiedPurchase: boolean;
  isApproved: boolean;
  isHelpful: number;
  sellerResponse: string | null;
  sellerResponseAt: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
  };
  product: {
    id: string;
    name: string;
    imageUrl: string | null;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'approved' | 'pending'>('all');
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [responseText, setResponseText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
      });

      if (filterStatus !== 'all') {
        params.set('status', filterStatus);
      }
      if (filterRating) {
        params.set('rating', String(filterRating));
      }
      if (search) {
        params.set('search', search);
      }

      const res = await fetch(`/api/admin/reviews?${params}`);
      const data = await res.json();

      if (data.success) {
        setReviews(data.reviews);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('[FETCH_REVIEWS]', error);
      toast.error('Erro ao carregar avaliações');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [pagination.page, pagination.limit, filterStatus, filterRating, search]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchReviews();
  };

  const handleApprove = async (reviewId: string, approve: boolean) => {
    try {
      const res = await fetch(`/api/reviews/${reviewId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isApproved: approve }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(approve ? "Avaliação aprovada" : "Avaliação reprovada");
        setReviews(reviews.map((r) => (r.id === reviewId ? { ...r, isApproved: approve } : r)));
      } else {
        toast.error(data.error || "Erro ao atualizar avaliação");
      }
    } catch (error) {
      toast.error("Erro ao atualizar avaliação");
    }
  };

  const handleDelete = async (reviewId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta avaliação?")) return;

    try {
      const res = await fetch(`/api/reviews/${reviewId}`, { method: "DELETE" });
      const data = await res.json();

      if (data.success) {
        toast.success("Avaliação excluída");
        setReviews(reviews.filter((r) => r.id !== reviewId));
      } else {
        toast.error(data.error || "Erro ao excluir avaliação");
      }
    } catch (error) {
      toast.error("Erro ao excluir avaliação");
    }
  };

  const handleResponse = async () => {
    if (!selectedReview || !responseText.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/reviews/${selectedReview.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "seller_response",
          sellerResponse: responseText,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Resposta enviada com sucesso");
        setReviews(reviews.map((r) => (r.id === selectedReview.id ? { ...r, sellerResponse: responseText, sellerResponseAt: new Date().toISOString() } : r)));
        setSelectedReview(null);
        setResponseText("");
      } else {
        toast.error(data.error || "Erro ao enviar resposta");
      }
    } catch (error) {
      toast.error("Erro ao enviar resposta");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const StarRating = ({ rating }: { rating: number }) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star key={star} className={`h-4 w-4 ${star <= rating ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 text-gray-200"}`} />
      ))}
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Avaliações</h1>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-xl shadow-sm space-y-4">
        <div className="flex flex-wrap gap-4">
          {/* Busca */}
          <form onSubmit={handleSearch} className="flex-1 min-w-[300px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input type="text" placeholder="Buscar por produto ou usuário..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500" />
            </div>
          </form>

          {/* Filtro de status */}
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value as "all" | "approved" | "pending");
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">Todos os status</option>
            <option value="approved">Aprovadas</option>
            <option value="pending">Pendentes</option>
          </select>

          {/* Filtro de rating */}
          <select
            value={filterRating || ""}
            onChange={(e) => {
              setFilterRating(e.target.value ? Number(e.target.value) : null);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Todas as notas</option>
            {[5, 4, 3, 2, 1].map((r) => (
              <option key={r} value={r}>
                {r} estrelas
              </option>
            ))}
          </select>

          {/* Tamanho da página */}
          <div className="flex items-center">
            <label className="text-sm text-gray-600 mr-2">Por página:</label>
            <select
              value={pagination.limit}
              onChange={(e) => {
                const newLimit = Number(e.target.value);
                setPagination((prev) => ({ ...prev, limit: newLimit, page: 1 }));
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de avaliações */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white p-6 rounded-xl shadow-sm animate-pulse">
              <div className="flex gap-4">
                <div className="w-16 h-16 bg-gray-200 rounded-lg" />
                <div className="flex-1 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-1/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="bg-white p-12 rounded-xl shadow-sm text-center">
          <Star className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma avaliação encontrada</h3>
          <p className="text-gray-500">As avaliações dos clientes aparecerão aqui.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="bg-white p-6 rounded-xl shadow-sm">
              <div className="flex gap-4">
                {/* Imagem do produto */}
                <div className="flex-shrink-0 w-20 h-20 bg-gray-100 rounded-lg overflow-hidden">
                  {review.product.imageUrl ? (
                    <img src={review.product.imageUrl} alt={review.product.name} className="w-full h-full object-contain" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Conteúdo */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="font-medium text-gray-900 truncate">{review.product.name}</h3>
                      <p className="text-sm text-gray-500">Por: {review.user.name || review.user.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${review.isApproved ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>{review.isApproved ? "Aprovada" : "Pendente"}</span>
                      {review.isVerifiedPurchase && <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">Compra Verificada</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <StarRating rating={review.rating} />
                    <span className="text-sm text-gray-500">{formatDate(review.createdAt)}</span>
                  </div>

                  {review.title && <h4 className="font-medium text-gray-900 mb-1">{review.title}</h4>}

                  {review.comment && <p className="text-gray-600 text-sm mb-3">{review.comment}</p>}

                  {/* Resposta do vendedor */}
                  {review.sellerResponse && (
                    <div className="p-3 bg-gray-50 rounded-lg border-l-4 border-primary-500 mb-3">
                      <p className="text-xs font-medium text-gray-700 mb-1">Sua resposta:</p>
                      <p className="text-sm text-gray-600">{review.sellerResponse}</p>
                    </div>
                  )}

                  {/* Ações */}
                  <div className="flex flex-wrap gap-2 pt-3 border-t">
                    {!review.isApproved && (
                      <Button size="sm" variant="outline" onClick={() => handleApprove(review.id, true)} className="text-green-600 border-green-200 hover:bg-green-50">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Aprovar
                      </Button>
                    )}
                    {review.isApproved && (
                      <Button size="sm" variant="outline" onClick={() => handleApprove(review.id, false)} className="text-yellow-600 border-yellow-200 hover:bg-yellow-50">
                        <XCircle className="h-4 w-4 mr-1" />
                        Desaprovar
                      </Button>
                    )}
                    {!review.sellerResponse && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedReview(review);
                          setResponseText("");
                        }}
                      >
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Responder
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => handleDelete(review.id)} className="text-red-600 border-red-200 hover:bg-red-50">
                      <Trash2 className="h-4 w-4 mr-1" />
                      Excluir
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Paginação */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between bg-white px-4 py-3 rounded-xl shadow-sm">
          <div className="text-sm text-gray-500">
            Mostrando {(pagination.page - 1) * pagination.limit + 1} a {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPagination((prev) => ({ ...prev, page: 1 }))} disabled={pagination.page === 1}>
              Primeiro
            </Button>

            <Button variant="outline" size="sm" onClick={() => setPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))} disabled={pagination.page === 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(7, pagination.totalPages) }, (_, i) => {
                let pageNum;
                if (pagination.totalPages <= 7) {
                  pageNum = i + 1;
                } else if (pagination.page <= 4) {
                  pageNum = i + 1;
                } else if (pagination.page >= pagination.totalPages - 3) {
                  pageNum = pagination.totalPages - 6 + i;
                } else {
                  pageNum = pagination.page - 3 + i;
                }

                if (pageNum < 1 || pageNum > pagination.totalPages) return null;

                return (
                  <Button key={pageNum} size="sm" variant={pagination.page === pageNum ? "default" : "outline"} onClick={() => setPagination((prev) => ({ ...prev, page: pageNum }))} className="w-9 h-9">
                    {pageNum}
                  </Button>
                );
              })}
            </div>

            <Button variant="outline" size="sm" onClick={() => setPagination((prev) => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))} disabled={pagination.page >= pagination.totalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>

            <Button variant="outline" size="sm" onClick={() => setPagination((prev) => ({ ...prev, page: prev.totalPages }))} disabled={pagination.page >= pagination.totalPages}>
              Último
            </Button>
          </div>
        </div>
      )}

      {/* Modal de resposta */}
      {selectedReview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4">
            <h3 className="text-lg font-semibold">Responder Avaliação</h3>

            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <StarRating rating={selectedReview.rating} />
                <span className="text-sm font-medium">{selectedReview.user.name}</span>
              </div>
              {selectedReview.title && <p className="font-medium text-gray-900 text-sm">{selectedReview.title}</p>}
              {selectedReview.comment && <p className="text-gray-600 text-sm mt-1">{selectedReview.comment}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sua resposta</label>
              <textarea value={responseText} onChange={(e) => setResponseText(e.target.value)} rows={4} placeholder="Escreva sua resposta..." className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 resize-none" maxLength={500} />
              <p className="text-xs text-gray-400 mt-1">{responseText.length}/500</p>
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedReview(null);
                  setResponseText("");
                }}
              >
                Cancelar
              </Button>
              <Button onClick={handleResponse} disabled={!responseText.trim() || submitting}>
                {submitting ? "Enviando..." : "Enviar Resposta"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
