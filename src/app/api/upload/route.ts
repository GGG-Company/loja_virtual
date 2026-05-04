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

/** Valida magic bytes para evitar upload de arquivos maliciosos renomeados */
function validateMagicBytes(type: string, bytes: Uint8Array): boolean {
  if (type === 'image') {
    // PNG: 89 50 4E 47
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return true;
    // JPEG: FF D8 FF
    if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) return true;
    // GIF: 47 49 46 38
    if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return true;
    // WebP: RIFF????WEBP
    if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
      && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return true;
    return false;
  }
  if (type === 'video') {
    // MP4/MOV: ftyp signature at bytes 4-7
    const sig = String.fromCharCode(bytes[4], bytes[5], bytes[6], bytes[7]);
    if (sig === 'ftyp' || sig === 'mdat' || sig === 'moov') return true;
    // WebM: 1A 45 DF A3
    if (bytes[0] === 0x1A && bytes[1] === 0x45 && bytes[2] === 0xDF && bytes[3] === 0xA3) return true;
    return false;
  }
  return false;
}

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

    // Ler bytes para validar magic bytes (evita arquivos maliciosos renomeados)
    const rawBytes = await file.arrayBuffer();
    const magicBytes = new Uint8Array(rawBytes);

    if (type === 'image') {
      if (!file.type.startsWith('image/') || !ALLOWED_IMAGE_EXTS.includes(ext)) {
        return NextResponse.json({ error: 'Extensão de imagem não permitida. Use: jpg, png, gif, webp' }, { status: 400 });
      }
      if (!validateMagicBytes('image', magicBytes)) {
        return NextResponse.json({ error: 'Arquivo inválido ou corrompido' }, { status: 400 });
      }
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: 'Imagem deve ter no máximo 5MB' }, { status: 400 });
      }
    } else if (type === 'video') {
      if (!file.type.startsWith('video/') || !ALLOWED_VIDEO_EXTS.includes(ext)) {
        return NextResponse.json({ error: 'Extensão de vídeo não permitida. Use: mp4, webm, mov' }, { status: 400 });
      }
      if (!validateMagicBytes('video', magicBytes)) {
        return NextResponse.json({ error: 'Arquivo inválido ou corrompido' }, { status: 400 });
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

    // Salvar arquivo (usar os bytes já lidos — sem novo arrayBuffer())
    await writeFile(filepath, Buffer.from(rawBytes));

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
