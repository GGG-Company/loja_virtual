import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/auth';

export async function proxy(request: NextRequest) {
  const session = await auth();
  const { pathname } = request.nextUrl;
  const originHeader = request.headers.get("origin") || "";
  const allowedOrigins = ["http://localhost:3000", "https://loja.azura.dev.br", "https://socket.azura.dev.br"];
  const isAllowedOrigin = allowedOrigins.includes(originHeader);
  
  const corsHeaders: Record<string, string> = {
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Internal-Api-Key",
  };

  // Só define Access-Control-Allow-Origin se a origin estiver na whitelist
  if (isAllowedOrigin) {
    corsHeaders["Access-Control-Allow-Origin"] = originHeader;
  }

  const applyCors = (res: NextResponse | Response) => {
    try {
      if (res instanceof NextResponse) {
        Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v as string));
        return res;
      }
      const cloned = new Response(res.body, { status: res.status, statusText: res.statusText, headers: res.headers });
      Object.entries(corsHeaders).forEach(([k, v]) => cloned.headers.set(k, v as string));
      return cloned;
    } catch (e) {
      return res;
    }
  };

  // Handle CORS preflight for any /api/* route
  if (pathname.startsWith("/api") && request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // ============================================
  // 1. PROTEÇÃO DE ROTAS DO CLIENTE
  // ============================================

  const protectedCustomerRoutes = ["/minha-conta", "/checkout"];
  if (protectedCustomerRoutes.some(route => pathname.startsWith(route))) {
    if (!session?.user) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
  }

  // ============================================
  // 2. PROTEÇÃO DE ROTAS ADMIN (Páginas)
  // ============================================

  if (pathname.startsWith("/admin/financial")) {
    if (!session?.user) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
    if (session.user.role !== "OWNER") {
      return NextResponse.redirect(new URL("/admin/unauthorized", request.url));
    }
  }

  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/financial")) {
    if (!session?.user) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
    if (session.user.role === "CUSTOMER") {
      return NextResponse.redirect(new URL("/admin/unauthorized", request.url));
    }
  }

  // ============================================
  // 3. PROTEÇÃO DE API ROUTES
  // ============================================
  
  if (pathname.startsWith('/api')) {
    const publicApiRoutes = [
      '/api/auth',
      '/api/payments/mercadopago/webhook',
      '/api/integrations/melhor-envio/authorize',
      '/api/integrations/melhor-envio/callback',
      '/api/products',
      '/api/categories',
      '/api/site-config',
      '/api/financial/config',
      '/api/shipping',
    ];

    if (publicApiRoutes.some(route => pathname.includes(route))) {
      return applyCors(NextResponse.next());
    }

    const apiKey = request.headers.get('X-INTERNAL-API-KEY');
    const validKey = process.env.X_INTERNAL_API_KEY;

    if (apiKey && apiKey === validKey) {
      return applyCors(NextResponse.next());
    }

    if (session?.user) {
      if (pathname.startsWith('/api/admin')) {
        if (session.user.role === 'CUSTOMER') {
          return applyCors(NextResponse.json({ error: 'Forbidden' }, { status: 403 }));
        }
      }
      return applyCors(NextResponse.next());
    }

    return applyCors(NextResponse.json(
      { error: 'Não autorizado - Chave de API ou Login necessário' },
      { status: 401 }
    ));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/:path*", "/minha-conta/:path*", "/checkout/:path*"],
};
