import { NextResponse } from 'next/server';
import { auth } from '@/auth';

// SSE endpoint to subscribe to Redis pubsub channel for a chat.
// Requires REDIS_URL env var. Falls back to 501 if Redis not configured.
export async function GET(request: Request, context: { params: Promise<{ chatId: string }> }) {
  const { chatId } = await context.params;
  const session = await auth();

  // basic auth check: only admins/owners or chat owner allowed to subscribe
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const REDIS_URL = process.env.REDIS_URL;
  if (!REDIS_URL) {
    return NextResponse.json({ error: 'SSE não disponível (REDIS_URL não configurado)' }, { status: 501 });
  }

  const { Readable } = await import('stream');
  const Redis = (await import('ioredis')).default;

  const subscriber = new Redis(REDIS_URL);
  const channel = `support:chat:${chatId}`;

  // Create a TransformStream to handle SSE
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  // Send initial comment to keep connection open
  writer.write(encoder.encode(`: connected\n\n`));

  const onMessage = (chan: string, message: string) => {
    try {
      let sseData = `event: message\n`;
      const lines = message.split('\n');
      for (const line of lines) {
        sseData += `data: ${line}\n`;
      }
      sseData += '\n';
      writer.write(encoder.encode(sseData));
    } catch (e) {
      // ignore
    }
  };

  subscriber.subscribe(channel).then(() => {
    subscriber.on('message', onMessage as any);
  }).catch((err: any) => {
    console.error('[SSE SUBSCRIBE] error', err);
    writer.write(encoder.encode(`event: error\ndata: ${JSON.stringify({ error: 'subscribe_failed' })}\n\n`));
  });

  // When client disconnects, cleanup subscriber
  const res = new NextResponse(readable, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });

  // hook for cleanup
  request.signal.addEventListener('abort', async () => {
    try {
      subscriber.off('message', onMessage as any);
      await subscriber.unsubscribe(channel);
      subscriber.disconnect();
      writer.close();
    } catch (e) {}
  });

  return res;
}
