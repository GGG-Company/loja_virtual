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
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700',
    },
    {
      label: 'Pedidos Total',
      value: stats?.totalOrders || 0,
      icon: ShoppingCart,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700',
    },
    {
      label: 'Pedidos Pendentes',
      value: stats?.pendingOrders || 0,
      icon: Clock,
      color: 'from-yellow-500 to-yellow-600',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-700',
    },
    {
      label: 'Faturamento',
      value: new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(stats?.totalRevenue || 0),
      icon: DollarSign,
      color: 'from-primary-500 to-primary-600',
      bgColor: 'bg-primary-50',
      textColor: 'text-primary-700',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-metallic-900">
          Dashboard Administrativo
        </h1>
        <p className="text-metallic-600 mt-2 text-lg">
          Bem-vindo, <span className="font-semibold">{session?.user?.name}</span> 
          <span className="ml-2 px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium">
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
                  className="flex justify-between items-center p-4 bg-metallic-50 rounded-lg hover:bg-metallic-100 transition-colors"
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
