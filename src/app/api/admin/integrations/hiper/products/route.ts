import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getHiperProducts } from '@/lib/hiper';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== 'ADMIN' && role !== 'OWNER') return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });

  const products = await getHiperProducts(0);

  if (products === null) {
    return NextResponse.json({ error: 'Falha ao buscar produtos do Hiper' }, { status: 502 });
  }

  // Achata produtos com grade (retorna pai + variações como itens separados)
  const flat: { id: string; nome: string; codigo: number; codigoDeBarras: string; preco: number }[] = [];

  for (const p of products) {
    if (p.grade && p.variacao?.length) {
      for (const v of p.variacao) {
        flat.push({
          id: v.id,
          nome: `${p.nome} — ${v.nomeVariacaoA ?? ''}${v.nomeVariacaoB ? ` / ${v.nomeVariacaoB}` : ''}`.trim(),
          codigo: v.codigo ?? p.codigo,
          codigoDeBarras: v.codigoDeBarras ?? '',
          preco: p.preco ?? 0,
        });
      }
    } else {
      flat.push({
        id: p.id,
        nome: p.nome,
        codigo: p.codigo,
        codigoDeBarras: p.codigoDeBarras ?? '',
        preco: p.preco ?? 0,
      });
    }
  }

  const seen = new Set<string>();
  const deduped = flat.filter(p => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });

  return NextResponse.json({ products: deduped });
}
