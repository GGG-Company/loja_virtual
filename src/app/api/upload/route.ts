import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import crypto from 'crypto';
import logger from '@/lib/logger';
import { uploadLimiter } from '@/lib/rate-limit';

const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads');
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB para vídeos
const ALLOWED_IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
const ALLOWED_VIDEO_EXTS = ['mp4', 'webm', 'mov'];

/**
 * POST /api/upload
 * Fazer upload de imagem/vídeo para devolução
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Rate limiting para evitar DoS por upload
    const blocked = await uploadLimiter.check(request);
    if (blocked) return blocked;

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;

    if (!file) {
      return NextResponse.json({ error: 'Arquivo não fornecido' }, { status: 400 });
    }

    // Validar tipo de arquivo (MIME + extensão)
    const ext = (file.name.split('.').pop() || '').toLowerCase();

    if (type === 'image') {
      if (!file.type.startsWith('image/') || !ALLOWED_IMAGE_EXTS.includes(ext)) {
        return NextResponse.json({ error: 'Extensão de imagem não permitida. Use: jpg, png, gif, webp' }, { status: 400 });
      }
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: 'Imagem deve ter no máximo 5MB' }, { status: 400 });
      }
    } else if (type === 'video') {
      if (!file.type.startsWith('video/') || !ALLOWED_VIDEO_EXTS.includes(ext)) {
        return NextResponse.json({ error: 'Extensão de vídeo não permitida. Use: mp4, webm, mov' }, { status: 400 });
      }
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: 'Vídeo deve ter no máximo 50MB' }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: 'Tipo de arquivo inválido' }, { status: 400 });
    }

    // Criar diretório se não existir
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    // Gerar nome único criptograficamente seguro
    const random = crypto.randomBytes(16).toString('hex');
    const filename = `${type}-${random}.${ext}`;
    const filepath = join(UPLOAD_DIR, filename);

    // Salvar arquivo
    const bytes = await file.arrayBuffer();
    await writeFile(filepath, Buffer.from(bytes));

    // Retornar URL do arquivo
    const url = `/uploads/${filename}`;

    return NextResponse.json({
      success: true,
      url,
      filename,
    });
  } catch (error) {
    logger.error(error as Error, '[UPLOAD_ERROR]');
    return NextResponse.json({ error: 'Erro ao fazer upload' }, { status: 500 });
  }
}
