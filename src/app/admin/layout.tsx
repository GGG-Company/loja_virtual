'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  List,
  DollarSign,
  Settings,
  LogOut,
  Menu,
  X,
  Truck,
} from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  type UserRole = 'CUSTOMER' | 'ADMIN' | 'OWNER';
  const userRole = (session?.user as { role?: UserRole } | undefined)?.role;

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
    
    if (session && userRole === 'CUSTOMER') {
      router.push('/');
    }
  }, [status, session, userRole, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!session || userRole === 'CUSTOMER') {
    return null;
  }

  const menuItems = [
    { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/admin/products', icon: Package, label: 'Produtos' },
    { href: '/admin/orders', icon: ShoppingCart, label: 'Pedidos' },
    { href: '/admin/picking', icon: List, label: 'Separação' },
    { href: '/admin/orders/enviados', icon: Truck, label: 'Pedidos Enviados' },
    { href: '/admin/cupons', icon: DollarSign, label: 'Cupons' },
    ...(userRole === 'OWNER'
      ? [{ href: '/admin/financial', icon: DollarSign, label: 'Financeiro' }]
      : []),
    { href: '/admin/settings', icon: Settings, label: 'Configurações' },
  ];

  return (
    <div className="min-h-screen bg-metallic-50">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-metallic-200 px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-metallic-900">Admin Panel</h1>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 hover:bg-metallic-100 rounded-lg"
        >
          {sidebarOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen w-64 bg-gradient-to-b from-metallic-900 to-metallic-800 text-white z-50 transition-transform lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6">
          {/* Logo */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold">🔨 Admin</h2>
            <p className="text-xs text-metallic-400 mt-1">Shopping das Ferramentas</p>
          </div>

          {/* User Info */}
          <div className="mb-8 p-4 bg-white/10 rounded-lg backdrop-blur-sm">
            <p className="font-semibold text-sm">{session.user?.name}</p>
            <p className="text-xs text-metallic-400">{session.user?.email}</p>
            <span className="mt-2 inline-block px-2 py-1 bg-primary-500/20 text-primary-300 rounded text-xs font-medium">
              {userRole}
            </span>
          </div>

          {/* Navigation */}
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isActive
                      ? 'bg-primary-600 text-white shadow-lg'
                      : 'hover:bg-white/10 text-metallic-300'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="mt-8 w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-500/20 text-red-300 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium">Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 pt-16 lg:pt-0">
        <div className="p-6 lg:p-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </div>
      </main>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
