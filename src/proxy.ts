import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/auth';

export async function proxy(request: NextRequest) {
  const session = await auth();
  const { pathname } = request.nextUrl;

  // ============================================
  // 1. PROTEÇÃO DE ROTAS ADMIN
  // ============================================
  
  // Rotas financeiras: apenas OWNER
  if (pathname.startsWith('/admin/financial')) {
    if (!session?.user) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }
    
    if (session.user.role !== 'OWNER') {
      return NextResponse.redirect(new URL('/admin/unauthorized', request.url));
    }
  }

  // Rotas administrativas: ADMIN ou OWNER
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/financial')) {
    if (!session?.user) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }
    
    if (session.user.role === 'CUSTOMER') {
      return NextResponse.redirect(new URL('/admin/unauthorized', request.url));
    }
  }

  // ============================================
  // 2. PROTEÇÃO DE API ROUTES
  // ============================================
  
  // APIs globais: requer X-INTERNAL-API-KEY ou Sessão válida
  if (pathname.startsWith('/api')) {
    // 1. Whitelist: Rotas que PRECISAM ser públicas (Webhooks, Auth, etc)
    const publicApiRoutes = [
      '/api/auth',
      '/api/payments/mercadopago/webhook',
      '/api/integrations/melhor-envio/authorize',
      '/api/integrations/melhor-envio/callback',
    ];

    if (publicApiRoutes.some(route => pathname.includes(route))) {
      return NextResponse.next();
    }

    // 2. Validação por Chave de API (Útil para n8n, scripts, Postman)
    const apiKey = request.headers.get('X-INTERNAL-API-KEY');
    const validKey = process.env.X_INTERNAL_API_KEY;

    if (apiKey && apiKey === validKey) {
      return NextResponse.next();
    }

    // 3. Validação por Sessão (Útil para o próprio Frontend da loja)
    if (session?.user) {
      // Se for rota de Admin, verifica a Role
      if (pathname.startsWith('/api/admin')) {
        if (session.user.role === 'CUSTOMER') {
          return NextResponse.json({ error: 'Proibido' }, { status: 403 });
        }
      }
      return NextResponse.next();
    }

    // Se não tem chave válida E não tem sessão, bloqueia
    return NextResponse.json(
      { error: 'Não autorizado - Chave de API ou Login necessário' },
      { status: 401 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
    '/api/integrations/:path*',
  ],
};
