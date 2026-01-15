import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    let config = await prisma.siteConfig.findFirst();
    
    if (!config) {
      config = await prisma.siteConfig.create({
        data: {
          id: 'singleton',
          assistantMode: 'smart',
        },
      });
    }

    return NextResponse.json({ assistantMode: config.assistantMode });
  } catch (error) {
    console.error('[GET PUBLIC SITE CONFIG]', error);
    return NextResponse.json({ assistantMode: 'smart' }, { status: 200 });
  }
}
