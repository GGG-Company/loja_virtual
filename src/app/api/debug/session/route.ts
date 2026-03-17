import { NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        id: session.user.id,
        name: session.user.name || null,
        email: session.user.email || null,
        role: session.user.role || null,
      },
    });
  } catch (err) {
    console.error('[DEBUG SESSION]', err);
    return NextResponse.json({ error: 'Erro no debug session' }, { status: 500 });
  }
}
