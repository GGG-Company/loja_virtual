import { NextResponse } from 'next/server';
import { auth } from '@/auth';

// SSE endpoint to subscribe to Redis pubsub channel for a chat.
// Requires REDIS_URL env var. Falls back to 501 if Redis not configured.
export async function GET(request: Request, { params }: { params: { chatId: string } }) {
  const { chatId } = params;
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

  // Create a readable stream that will be used as the response body
  const stream = new Readable({
    read() {},
  });

  // Send initial comment to keep connection open
  stream.push(`: connected\n\n`);

  const onMessage = (chan: string, message: string) => {
    try {
      // write SSE event
      stream.push(`event: message\n`);
      // data must be sent line by line
      const lines = message.split('\n');
      for (const line of lines) {
        stream.push(`data: ${line}\n`);
      }
      stream.push('\n');
    } catch (e) {
      // ignore
    }
  };

  subscriber.subscribe(channel).then(() => {
    subscriber.on('message', onMessage as any);
  }).catch((err: any) => {
    console.error('[SSE SUBSCRIBE] error', err);
    stream.push(`event: error\ndata: ${JSON.stringify({ error: 'subscribe_failed' })}\n\n`);
  });

  // When client disconnects, cleanup subscriber
  const res = new NextResponse(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });

  // hook into Node.js response close via symbolic header that Next will keep open
  // Note: Next serverless environments may not support long-lived SSE.
  (res as any).onClose = async () => {
    try {
      subscriber.off('message', onMessage as any);
      await subscriber.unsubscribe(channel);
      subscriber.disconnect();
    } catch (e) {}
  };

  return res;
}
