'use client';

import { useState, useEffect, useCallback } from "react";
import { Star, ThumbsUp, CheckCircle, ChevronDown, User, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import Image from "next/image";

interface Review {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  isVerifiedPurchase: boolean;
  isHelpful: number;
  sellerResponse: string | null;
  sellerResponseAt: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  distribution: Record<number, number>;
}

interface ProductReviewsProps {
  productId: string;
  productName: string;
}

export function ProductReviews({ productId, productName }: ProductReviewsProps) {
  const { data: session } = useSession();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState("recent");
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [newRating, setNewRating] = useState(5);
  const [newTitle, setNewTitle] = useState("");
  const [newComment, setNewComment] = useState("");
  const [hoverRating, setHoverRating] = useState(0);

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: "5",
        sortBy,
      });
      if (filterRating) {
        params.set("rating", String(filterRating));
      }

      const res = await fetch(`/api/products/${productId}/reviews?${params}`);
      const data = await res.json();

      if (data.success) {
        setReviews(data.reviews);
        setStats(data.stats);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error("[FETCH_REVIEWS]", error);
    } finally {
      setLoading(false);
    }
  }, [productId, page, sortBy, filterRating]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session) {
      toast.error("Faça login para avaliar");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/products/${productId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: newRating,
          title: newTitle || undefined,
          comment: newComment || undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Avaliação enviada com sucesso!");
        setShowForm(false);
        setNewRating(5);
        setNewTitle("");
        setNewComment("");
        setPage(1);
        fetchReviews();
      } else {
        toast.error(data.error || "Erro ao enviar avaliação");
      }
    } catch (error) {
      toast.error("Erro ao enviar avaliação");
    } finally {
      setSubmitting(false);
    }
  };

  const handleHelpful = async (reviewId: string) => {
    try {
      const res = await fetch(`/api/reviews/${reviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "helpful" }),
      });

      const data = await res.json();
      if (data.success) {
        setReviews(reviews.map((r) => (r.id === reviewId ? { ...r, isHelpful: data.isHelpful } : r)));
        toast.success("Obrigado pelo feedback!");
      }
    } catch (error) {
      toast.error("Erro ao marcar como útil");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const StarRating = ({ rating, size = "md", interactive = false, onRate }: { rating: number; size?: "sm" | "md" | "lg"; interactive?: boolean; onRate?: (r: number) => void }) => {
    const sizeClass = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-6 w-6" : "h-5 w-5";
    const displayRating = interactive ? hoverRating || rating : rating;

    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button key={star} type="button" disabled={!interactive} onClick={() => interactive && onRate?.(star)} onMouseEnter={() => interactive && setHoverRating(star)} onMouseLeave={() => interactive && setHoverRating(0)} className={interactive ? "cursor-pointer" : "cursor-default"}>
            <Star className={`${sizeClass} ${star <= displayRating ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 text-gray-200"} transition-colors`} />
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header com estatísticas */}
      <div className="flex flex-col lg:flex-row gap-6 p-6 bg-white rounded-xl shadow-sm">
        {/* Rating geral */}
        <div className="flex flex-col items-center justify-center lg:border-r lg:pr-8">
          <div className="text-5xl font-bold text-gray-900">{stats?.averageRating.toFixed(1) || "0.0"}</div>
          <StarRating rating={Math.round(stats?.averageRating || 0)} size="lg" />
          <p className="text-sm text-gray-500 mt-2">{stats?.totalReviews || 0} avaliações</p>
        </div>

        {/* Distribuição de ratings */}
        <div className="flex-1 space-y-2">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = stats?.distribution[star] || 0;
            const percentage = stats?.totalReviews ? (count / stats.totalReviews) * 100 : 0;

            return (
              <button key={star} onClick={() => setFilterRating(filterRating === star ? null : star)} className={`flex items-center gap-2 w-full group hover:bg-gray-50 p-1 rounded transition-colors ${filterRating === star ? "bg-primary-50" : ""}`}>
                <span className="text-sm text-gray-600 w-16">{star} estrelas</span>
                <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-400 rounded-full transition-all" style={{ width: `${percentage}%` }} />
                </div>
                <span className="text-sm text-gray-500 w-10 text-right">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Botão de avaliar */}
        <div className="flex flex-col items-center justify-center lg:border-l lg:pl-8">
          <p className="text-sm text-gray-600 mb-3 text-center">Comprou este produto?</p>
          <Button onClick={() => setShowForm(!showForm)}>
            <MessageSquare className="h-4 w-4 mr-2" />
            Avaliar Produto
          </Button>
        </div>
      </div>

      {/* Formulário de avaliação */}
      {showForm && (
        <form onSubmit={handleSubmitReview} className="p-6 bg-white rounded-xl shadow-sm space-y-4">
          <h3 className="text-lg font-semibold">Escreva sua avaliação</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sua nota</label>
            <StarRating rating={newRating} size="lg" interactive onRate={setNewRating} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título (opcional)</label>
            <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Resumo da sua avaliação" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" maxLength={100} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Comentário (opcional)</label>
            <textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Conte sua experiência com o produto..." rows={4} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none" maxLength={1000} />
            <p className="text-xs text-gray-400 mt-1">{newComment.length}/1000</p>
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Enviando..." : "Enviar Avaliação"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      )}

      {/* Filtros e ordenação */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {filterRating && (
            <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm flex items-center gap-1">
              {filterRating} estrelas
              <button onClick={() => setFilterRating(null)} className="ml-1 hover:text-primary-900">
                ×
              </button>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Ordenar por:</span>
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
          >
            <option value="recent">Mais recentes</option>
            <option value="helpful">Mais úteis</option>
            <option value="rating_high">Maior nota</option>
            <option value="rating_low">Menor nota</option>
          </select>
        </div>
      </div>

      {/* Lista de avaliações */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-6 bg-white rounded-xl shadow-sm animate-pulse">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-1/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="p-12 bg-white rounded-xl shadow-sm text-center">
          <Star className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma avaliação ainda</h3>
          <p className="text-gray-500">Seja o primeiro a avaliar este produto!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="p-6 bg-white rounded-xl shadow-sm">
              <div className="flex gap-4">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {review.user.image ? (
                    <Image src={review.user.image} alt={review.user.name || "Usuário"} width={48} height={48} className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                      <User className="h-6 w-6 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Conteúdo */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900">{review.user.name || "Usuário"}</span>
                    {review.isVerifiedPurchase && (
                      <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                        <CheckCircle className="h-3 w-3" />
                        Compra verificada
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <StarRating rating={review.rating} size="sm" />
                    <span className="text-sm text-gray-500">{formatDate(review.createdAt)}</span>
                  </div>

                  {review.title && <h4 className="font-medium text-gray-900 mb-1">{review.title}</h4>}

                  {review.comment && <p className="text-gray-600 whitespace-pre-line">{review.comment}</p>}

                  {/* Resposta do vendedor */}
                  {review.sellerResponse && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border-l-4 border-primary-500">
                      <p className="text-sm font-medium text-gray-900 mb-1">Resposta da loja</p>
                      <p className="text-sm text-gray-600">{review.sellerResponse}</p>
                    </div>
                  )}

                  {/* Ações */}
                  <div className="mt-4 flex items-center gap-4">
                    <button onClick={() => handleHelpful(review.id)} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors">
                      <ThumbsUp className="h-4 w-4" />
                      Útil ({review.isHelpful})
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button variant="outline" size="sm" onClick={() => setPage(1)} disabled={page === 1}>
            Primeira
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
            Anterior
          </Button>

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }

              return (
                <Button key={pageNum} variant={page === pageNum ? "default" : "outline"} size="sm" onClick={() => setPage(pageNum)} className="w-9 h-9">
                  {pageNum}
                </Button>
              );
            })}
          </div>

          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
            Próxima
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPage(totalPages)} disabled={page >= totalPages}>
            Última
          </Button>
        </div>
      )}
    </div>
  );
}
