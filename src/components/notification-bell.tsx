"use client";

import { useEffect, useState, useRef } from "react";
import { Bell, X, Check, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { toast } from "sonner";
import logger from "@/lib/logger";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  data?: string;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Buscar notificações
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/notifications?limit=10");

      if (!response.ok) throw new Error("Erro ao buscar notificações");

      const data = await response.json();
      setNotifications(data.notifications || []);

      // Contar não lidas
      const unread = (data.notifications || []).filter((n: Notification) => !n.isRead).length;
      setUnreadCount(unread);
    } catch (error) {
      logger.error(error, '[NOTIFICATIONS_FETCH]');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const response = await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      });

      if (!response.ok) throw new Error("Erro ao marcar como lida");

      // Atualizar localmente
      setNotifications(notifications.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n)));
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (error) {
      logger.error(error, '[MARK_AS_READ]');
      toast.error('Erro ao marcar notificação como lida');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const response = await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllAsRead: true }),
      });

      if (!response.ok) throw new Error("Erro ao marcar todos como lidos");

      // Atualizar localmente
      setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success("Todas as notificações marcadas como lidas");
    } catch (error) {
      console.error("[MARK_ALL_AS_READ]", error);
      toast.error("Erro ao marcar notificações");
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      const response = await fetch("/api/notifications", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      });

      if (!response.ok) throw new Error("Erro ao deletar");

      // Remover localmente
      const deleted = notifications.find((n) => n.id === notificationId);
      setNotifications(notifications.filter((n) => n.id !== notificationId));
      if (deleted && !deleted.isRead) {
        setUnreadCount(Math.max(0, unreadCount - 1));
      }
    } catch (error) {
      console.error("[DELETE_NOTIFICATION]", error);
      toast.error("Erro ao deletar notificação");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Agora";
    if (diffMins < 60) return `${diffMins}m atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays}d atrás`;
    return date.toLocaleDateString("pt-BR");
  };

  return (
    <div ref={dropdownRef} className="relative">
      <Button variant="ghost" size="sm" className="relative" onClick={() => setIsOpen(!isOpen)}>
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">{unreadCount > 9 ? "9+" : unreadCount}</span>}
      </Button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 max-h-96 flex flex-col z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="font-bold text-gray-900">Notificações</h3>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllAsRead} className="text-xs text-primary-600 hover:text-primary-700 font-medium">
                Marcar tudo como lido
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                <Bell className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">Nenhuma notificação</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <div key={notification.id} className={`p-4 hover:bg-gray-50 transition-colors ${!notification.isRead ? "bg-blue-50" : ""}`}>
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900">{notification.title}</p>
                          {!notification.isRead && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{notification.message}</p>

                        {/* Mostrar código de rastreio se disponível */}
                        {notification.data &&
                          (() => {
                            try {
                              const data = JSON.parse(notification.data);
                              if (data.trackingCode) {
                                return (
                                  <div className="mt-2 p-2 bg-gray-100 rounded-md">
                                    <p className="text-xs font-medium text-gray-700">Código de Rastreio:</p>
                                    {data.trackingUrl ? (
                                      <a href={data.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary-600 hover:text-primary-700 font-mono font-semibold">
                                        {data.trackingCode} ↗
                                      </a>
                                    ) : (
                                      <span className="text-sm font-mono font-semibold text-gray-900">{data.trackingCode}</span>
                                    )}
                                  </div>
                                );
                              }
                              return null;
                            } catch {
                              return null;
                            }
                          })()}

                        <p className="text-xs text-gray-400 mt-2">{formatDate(notification.createdAt)}</p>
                      </div>

                      <div className="flex gap-2 ml-2">
                        {!notification.isRead && (
                          <button onClick={() => handleMarkAsRead(notification.id)} className="text-primary-600 hover:text-primary-700 p-1" title="Marcar como lida">
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                        <button onClick={() => handleDelete(notification.id)} className="text-gray-400 hover:text-red-500 p-1" title="Deletar">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-4 border-t border-gray-200 text-center">
              <a href="/minha-conta/notificacoes" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                Ver todas as notificações
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
