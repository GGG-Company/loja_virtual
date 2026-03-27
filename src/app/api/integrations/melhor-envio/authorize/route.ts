import { NextResponse, NextRequest } from 'next/server';
import { buildAuthorizeUrl } from '@/lib/melhorenvio-oauth';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const state = crypto.randomUUID();
    const cookieStore = await cookies();
    cookieStore.set('melhorenvio_oauth_state', state, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    });
    const url = buildAuthorizeUrl(state);
    return NextResponse.redirect(url);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erro ao iniciar autorização' }, { status: 400 });
  }
}
