'use client';

import { useEffect, useState } from 'react';
import { Bell, Check, Trash2, Package, RefreshCw, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import Link from 'next/link';

interface NotificationData {
  orderId?: string;
  orderNumber?: string;
  returnId?: string;
  returnNumber?: string;
  trackingCode?: string;
  trackingUrl?: string;
  status?: string;
  labelUrl?: string;
  refundAmount?: number;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  data?: string;
}

export default function NotificacoesPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const fetchNotifications = async (pageNum: number = 1) => {
    try {
      setLoading(true);
      const offset = (pageNum - 1) * limit;
      const response = await fetch(`/api/notifications?limit=${limit}&offset=${offset}`);
      
      if (!response.ok) throw new Error('Erro ao buscar notificações');
      
      const data = await response.json();
      setNotifications((data.notifications || []).map((n: any) => ({
        ...n,
        data: n.data
          ? {
              ...n.data,
              refundAmount: n.data.refundAmount != null
                ? parseFloat(String(n.data.refundAmount))
                : undefined,
              amount: n.data.amount != null
                ? parseFloat(String(n.data.amount))
                : undefined,
            }
          : n.data,
      })));
      setTotal(data.pagination?.total || 0);
      setTotalPages(Math.ceil((data.pagination?.total || 0) / limit));
    } catch (error) {
      console.error('[NOTIFICATIONS_FETCH]', error);
      toast.error('Erro ao carregar notificações');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(page);
  }, [page]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId }),
      });

      if (!response.ok) throw new Error('Erro ao marcar como lida');

      setNotifications(
        notifications.map(n =>
          n.id === notificationId ? { ...n, isRead: true } : n
        )
      );
      toast.success('Marcada como lida');
    } catch (error) {
      console.error('[MARK_AS_READ]', error);
      toast.error('Erro ao marcar notificação como lida');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllAsRead: true }),
      });

      if (!response.ok) throw new Error('Erro ao marcar todos como lidos');

      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      toast.success('Todas as notificações marcadas como lidas');
    } catch (error) {
      console.error('[MARK_ALL_AS_READ]', error);
      toast.error('Erro ao marcar notificações');
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId }),
      });

      if (!response.ok) throw new Error('Erro ao deletar');

      setNotifications(notifications.filter(n => n.id !== notificationId));
      toast.success('Notificação removida');
    } catch (error) {
      console.error('[DELETE_NOTIFICATION]', error);
      toast.error('Erro ao deletar notificação');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const parseNotificationData = (dataString?: string): NotificationData | null => {
    if (!dataString) return null;
    try {
      return JSON.parse(dataString);
    } catch {
      return null;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ORDER_STATUS':
        return <Package className="h-5 w-5 text-blue-600" />;
      case 'RETURN_STATUS':
        return <RefreshCw className="h-5 w-5 text-orange-600" />;
      case 'PAYMENT':
        return <span className="text-green-600 text-lg">💳</span>;
      case 'PROMO':
        return <span className="text-purple-600 text-lg">🎉</span>;
      default:
        return <Bell className="h-5 w-5 text-gray-600" />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'ORDER_STATUS':
        return 'bg-blue-100 text-blue-800';
      case 'RETURN_STATUS':
        return 'bg-orange-100 text-orange-800';
      case 'PAYMENT':
        return 'bg-green-100 text-green-800';
      case 'PROMO':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'ORDER_STATUS':
        return 'Pedido';
      case 'RETURN_STATUS':
        return 'Devolução';
      case 'PAYMENT':
        return 'Pagamento';
      case 'PROMO':
        return 'Promoção';
      default:
        return 'Notificação';
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notificações</h1>
          <p className="text-gray-600 mt-1">
            {unreadCount > 0 
              ? `${unreadCount} não lida${unreadCount > 1 ? 's' : ''}` 
              : 'Todas lidas'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={handleMarkAllAsRead}>
            <Check className="h-4 w-4 mr-2" />
            Marcar todas como lidas
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Bell className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Nenhuma notificação</h2>
          <p className="text-gray-500">Você receberá notificações sobre seus pedidos aqui.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => {
            const data = parseNotificationData(notification.data);
            
            return (
              <div
                key={notification.id}
                className={`bg-white rounded-lg shadow p-5 border-l-4 transition-all ${
                  !notification.isRead 
                    ? 'border-l-blue-500 bg-blue-50/50' 
                    : 'border-l-gray-200'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {getTypeIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getTypeBadge(notification.type)}`}>
                        {getTypeLabel(notification.type)}
                      </span>
                      {!notification.isRead && (
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      )}
                    </div>
                    
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {notification.title}
                    </h3>
                    
                    <p className="text-gray-600 mb-3">
                      {notification.message}
                    </p>

                    {/* Dados extras da notificação */}
                    {data && (
                      <div className="space-y-2">
                        {/* Código de rastreio */}
                        {data.trackingCode && (
                          <div className="p-3 bg-gray-100 rounded-lg">
                            <p className="text-xs font-medium text-gray-600 mb-1">
                              Código de Rastreio
                            </p>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-gray-900">
                                {data.trackingCode}
                              </span>
                              {data.trackingUrl && (
                                <a
                                  href={data.trackingUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary-600 hover:text-primary-700 flex items-center gap-1 text-sm"
                                >
                                  Rastrear <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Link para pedido */}
                        {data.orderId && (
                          <Link
                            href={`/minha-conta/pedidos/${data.orderId}`}
                            className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
                          >
                            Ver detalhes do pedido <ExternalLink className="h-3 w-3" />
                          </Link>
                        )}

                        {/* Link para devolução */}
                        {data.returnId && (
                          <Link
                            href={`/minha-conta/devolucoes/${data.returnId}`}
                            className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
                          >
                            Ver devolução <ExternalLink className="h-3 w-3" />
                          </Link>
                        )}

                        {/* Valor de reembolso */}
                        {data.refundAmount && (
                          <p className="text-sm text-green-700 font-medium">
                            Valor do reembolso: R$ {data.refundAmount.toFixed(2)}
                          </p>
                        )}
                      </div>
                    )}

                    <p className="text-xs text-gray-400 mt-3">
                      {formatDate(notification.createdAt)}
                    </p>
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    {!notification.isRead && (
                      <button
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        title="Marcar como lida"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(notification.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remover"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Paginação */}
          <div className="bg-white rounded-lg shadow p-4 mt-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-sm text-gray-600">
                Mostrando {((page - 1) * limit) + 1} - {Math.min(page * limit, total)} de {total} notificações
              </p>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                >
                  Primeira
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
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
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPage(pageNum)}
                        className="w-9 h-9"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  Próxima
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(totalPages)}
                  disabled={page >= totalPages}
                >
                  Última
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
