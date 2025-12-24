import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/auth';

export async function middleware(request: NextRequest) {
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
  
  // APIs de integração: requer X-INTERNAL-API-KEY
  if (pathname.startsWith('/api/integrations')) {
    // Whitelist para fluxo OAuth do Melhor Envio (não usa API key)
    const oauthWhitelist = [
      '/api/integrations/melhor-envio/authorize',
      '/api/integrations/melhor-envio/callback',
    ];
    if (oauthWhitelist.includes(pathname)) {
      return NextResponse.next();
    }

    const apiKey = request.headers.get('X-INTERNAL-API-KEY');
    const validKey = process.env.X_INTERNAL_API_KEY;

    if (!apiKey || apiKey !== validKey) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid API Key' },
        { status: 401 }
      );
    }
  }

  // APIs admin: requer sessão ADMIN ou OWNER
  if (pathname.startsWith('/api/admin')) {
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    if (session.user.role === 'CUSTOMER') {
      return NextResponse.json(
        { error: 'Forbidden - Insufficient permissions' },
        { status: 403 }
      );
    }
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
