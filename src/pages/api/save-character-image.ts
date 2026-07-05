import type { APIRoute } from 'astro';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const prerender = false;

const PERSON_DIRECTORY = '/Users/vinskao/person';
const MAX_IMAGE_SIZE = 50 * 1024 * 1024;

export const GET: APIRoute = async () => {
  return Response.json({
    available: process.platform === 'darwin',
    charactersDirectory: PERSON_DIRECTORY,
    paddedDirectory: path.join(PERSON_DIRECTORY, 'characters_padded'),
  }, {
    status: process.platform === 'darwin' ? 200 : 409,
    headers: { 'Cache-Control': 'no-store' },
  });
};

function safePngName(value: FormDataEntryValue | null): string | null {
  if (typeof value !== 'string') return null;
  const baseName = path.basename(value).normalize('NFC');
  if (!baseName.toLowerCase().endsWith('.png') || baseName !== value) return null;
  return baseName;
}

export const POST: APIRoute = async ({ request }) => {
  if (process.platform !== 'darwin') {
    return new Response('此功能只允許在 macOS 執行環境寫入本機目錄', { status: 501 });
  }

  try {
    const form = await request.formData();
    const file = form.get('file');
    const fileName = safePngName(form.get('fileName'));
    const padded = form.get('padded') === 'true';

    if (!(file instanceof File) || !fileName) {
      return new Response('缺少有效的 PNG 檔案或檔名', { status: 400 });
    }
    if (file.size <= 0 || file.size > MAX_IMAGE_SIZE) {
      return new Response('圖片大小不合法', { status: 413 });
    }

    const targetDirectory = padded
      ? path.join(PERSON_DIRECTORY, 'characters_padded')
      : PERSON_DIRECTORY;
    await mkdir(targetDirectory, { recursive: true });

    const targetPath = path.join(targetDirectory, fileName);
    await writeFile(targetPath, Buffer.from(await file.arrayBuffer()));

    return Response.json({ path: targetPath });
  } catch (error) {
    console.error('角色圖片寫入失敗:', error);
    return new Response(error instanceof Error ? error.message : '角色圖片寫入失敗', { status: 500 });
  }
};
