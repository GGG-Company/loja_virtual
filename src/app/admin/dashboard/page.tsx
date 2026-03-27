'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Package, ShoppingCart, Clock, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';
import { statusToPt, statusBadgeClass } from '@/lib/i18n';
import { apiClient } from '@/lib/api-client';

export default function AdminDashboard() {
  const { data: session } = useSession();
  type DashboardStats = {
    totalProducts: number;
    totalOrders: number;
    pendingOrders: number;
    totalRevenue: number;
    recentOrders: Array<{
      id: string;
      total: number;
      status: string;
      createdAt: string;
    }>;
    lowStockProducts: Array<{
      id: string;
      name: string;
      sku: string;
      stock: number;
    }>;
  };

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const response = await apiClient.get<DashboardStats>('/api/admin/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Produtos Cadastrados',
      value: stats?.totalProducts || 0,
      icon: Package,
      color: 'from-[#CC1020] to-[#a80816]',
      bgColor: 'bg-red-50',
      textColor: 'text-[#CC1020]',
    },
    {
      label: 'Pedidos Total',
      value: stats?.totalOrders || 0,
      icon: ShoppingCart,
      color: 'from-[#1A1A1A] to-[#333333]',
      bgColor: 'bg-gray-100',
      textColor: 'text-[#1A1A1A]',
    },
    {
      label: 'Pedidos Pendentes',
      value: stats?.pendingOrders || 0,
      icon: Clock,
      color: 'from-amber-500 to-amber-600',
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-700',
    },
    {
      label: 'Faturamento',
      value: new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(stats?.totalRevenue || 0),
      icon: DollarSign,
      color: 'from-[#CC1020] to-[#a80816]',
      bgColor: 'bg-red-50',
      textColor: 'text-[#CC1020]',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-1 h-10 bg-[#CC1020] rounded-full" />
          <h1 className="font-display text-4xl font-bold text-[#1A1A1A] uppercase">
            Dashboard
          </h1>
        </div>
        <p className="text-gray-500 mt-1 font-body ml-4">
          Bem-vindo, <span className="font-semibold text-[#1A1A1A]">{session?.user?.name}</span>
          <span className="ml-2 px-3 py-1 bg-red-50 text-[#CC1020] rounded-sm text-sm font-bold font-display">
            {(session?.user as { role?: string } | null)?.role}
          </span>
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group"
            >
              <div className={`h-2 bg-gradient-to-r ${stat.color}`} />
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-xl ${stat.bgColor} group-hover:scale-110 transition-transform`}>
                    <Icon className={`h-6 w-6 ${stat.textColor}`} />
                  </div>
                  <TrendingUp className="h-5 w-5 text-green-500" />
                </div>
                <p className="text-sm text-metallic-600 font-medium">{stat.label}</p>
                <p className="text-3xl font-bold text-metallic-900 mt-2">
                  {stat.value}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Recent Orders & Low Stock Alert */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-2xl shadow-lg p-6"
        >
          <h2 className="text-2xl font-bold text-metallic-900 mb-4 flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-primary-600" />
            Pedidos Recentes
          </h2>
          <div className="space-y-3">
            {stats?.recentOrders?.length ? (
              stats.recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex justify-between items-center p-4 bg-gray-50 rounded-sm hover:bg-gray-100 transition-colors"
                >
                  <div>
                    <p className="font-semibold text-metallic-900">
                      Pedido #{order.id.slice(0, 8)}
                    </p>
                    <p className="text-sm text-metallic-600">
                      {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary-600">
                      R$ {order.total.toFixed(2)}
                    </p>
                    <span className={`text-xs px-2 py-1 rounded-full ${statusBadgeClass(order.status)}`}>
                      {statusToPt(order.status)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-metallic-600 text-center py-8">
                Nenhum pedido recente
              </p>
            )}
          </div>
        </motion.div>

        {/* Low Stock Alert */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-2xl shadow-lg p-6"
        >
          <h2 className="text-2xl font-bold text-metallic-900 mb-4 flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-orange-600" />
            Estoque Baixo
          </h2>
          <div className="space-y-3">
            {stats?.lowStockProducts?.length ? (
              stats.lowStockProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex justify-between items-center p-4 bg-orange-50 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-metallic-900 line-clamp-1">
                      {product.name}
                    </p>
                    <p className="text-sm text-metallic-600">
                      SKU: {product.sku}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-orange-600">
                      {product.stock} un.
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-metallic-600 text-center py-8">
                Estoque normalizado
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
