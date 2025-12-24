import { NextResponse, NextRequest } from 'next/server';
import { buildAuthorizeUrl } from '@/lib/melhorenvio-oauth';

export async function GET(req: NextRequest) {
  try {
    const state = Math.random().toString(36).slice(2);
    const url = buildAuthorizeUrl(state);
    return NextResponse.redirect(url);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erro ao iniciar autorização' }, { status: 400 });
  }
}
