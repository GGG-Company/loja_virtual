'use client';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  RotateCcw, 
  ChevronRight,
  Settings,
  Package,
  FileText,
} from 'lucide-react';

const modules = [
  {
    id: 'devolucoes',
    title: 'Devoluções',
    description: 'Gerenciar solicitações de devolução e reembolsos',
    icon: RotateCcw,
    href: '/admin/gerenciamento/devolucoes',
    color: 'bg-blue-500',
  },
  // Módulos futuros:
  // {
  //   id: 'trocas',
  //   title: 'Trocas',
  //   description: 'Gerenciar solicitações de troca de produtos',
  //   icon: Package,
  //   href: '/admin/gerenciamento/trocas',
  //   color: 'bg-purple-500',
  // },
  // {
  //   id: 'garantias',
  //   title: 'Garantias',
  //   description: 'Gerenciar solicitações de garantia',
  //   icon: FileText,
  //   href: '/admin/gerenciamento/garantias',
  //   color: 'bg-orange-500',
  // },
];

export default function GerenciamentoPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="h-7 w-7" />
            Gerenciamento
          </h1>
          <p className="text-gray-600 mt-1">
            Gerencie devoluções, trocas e outras operações
          </p>
        </div>
      </div>

      {/* Módulos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map((module, index) => {
          const Icon = module.icon;
          return (
            <motion.div
              key={module.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link href={module.href}>
                <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 cursor-pointer group">
                  <div className="flex items-start justify-between">
                    <div className={`p-3 rounded-lg ${module.color} text-white`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-primary-600 transition-colors" />
                  </div>
                  <h3 className="text-lg font-semibold mt-4 group-hover:text-primary-600 transition-colors">
                    {module.title}
                  </h3>
                  <p className="text-gray-600 text-sm mt-1">
                    {module.description}
                  </p>
                </div>
              </Link>
            </motion.div>
          );
        })}

        {/* Placeholder para módulos futuros */}
        <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg p-6 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Mais módulos em breve</p>
          </div>
        </div>
      </div>
    </div>
  );
}
