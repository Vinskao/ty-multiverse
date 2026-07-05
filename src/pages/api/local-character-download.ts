import type { APIRoute } from 'astro';
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';

const IMAGE_BASE_URL =
  process.env.PUBLIC_PEOPLE_IMAGE_URL ||
  import.meta.env.PUBLIC_PEOPLE_IMAGE_URL ||
  'https://peoplesystem.tatdvsonorth.com/images/people';

const CHARACTERS_DIR = path.join(homedir(), 'Pictures', 'images', 'characters');
const PADDED_DIR = path.join(CHARACTERS_DIR, 'characters_padded');
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);
const INVALID_FILENAME_CHARS = /[<>:"/\\|?*\u0000-\u001f]/g;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

function isLocalWindowsRequest(request: Request) {
  const url = new URL(request.url);
  return process.platform === 'win32' && LOCAL_HOSTS.has(url.hostname);
}

function safeFilename(name: string) {
  const sanitized = name.trim().replace(INVALID_FILENAME_CHARS, '_');
  if (!sanitized || sanitized === '.' || sanitized === '..') {
    throw new Error('Invalid character name');
  }
  return `${sanitized}.png`;
}

async function withConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>,
) {
  let index = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const item = items[index++];
      await worker(item);
    }
  });
  await Promise.all(runners);
}

export const GET: APIRoute = async ({ request }) => {
  if (!isLocalWindowsRequest(request)) {
    return json({ available: false }, 409);
  }

  return json({
    available: true,
    charactersDirectory: CHARACTERS_DIR,
    paddedDirectory: PADDED_DIR,
  });
};

export const POST: APIRoute = async ({ request }) => {
  if (!isLocalWindowsRequest(request)) {
    return json({ available: false }, 409);
  }

  let body: { names?: unknown; padded?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  if (
    !Array.isArray(body.names) ||
    body.names.length === 0 ||
    body.names.length > 500 ||
    !body.names.every((name) => typeof name === 'string')
  ) {
    return json({ error: 'names must contain 1 to 500 character names' }, 400);
  }

  const names = [...new Set(body.names as string[])];
  const padded = body.padded === true;
  const destination = padded ? PADDED_DIR : CHARACTERS_DIR;
  const failures: Array<{ name: string; error: string }> = [];
  let saved = 0;

  await mkdir(destination, { recursive: true });

  await withConcurrency(names, 4, async (name) => {
    let temporaryPath: string | undefined;
    try {
      const filename = safeFilename(name);
      const imageUrl = new URL(
        `${encodeURIComponent(name)}.png`,
        `${IMAGE_BASE_URL.replace(/\/+$/, '')}/`,
      );
      const response = await fetch(imageUrl, {
        headers: { Accept: 'image/png,image/*;q=0.8' },
        signal: AbortSignal.timeout(30_000),
      });

      if (!response.ok) {
        throw new Error(`Image server returned HTTP ${response.status}`);
      }

      const source = Buffer.from(await response.arrayBuffer());
      let output = source;
      if (padded) {
        const metadata = await sharp(source).metadata();
        if (!metadata.width || !metadata.height) {
          throw new Error('Image dimensions are unavailable');
        }
        output = await sharp(source)
          .extend({
            left: Math.round(metadata.width * 0.18),
            right: Math.round(metadata.width * 0.18),
            top: Math.round(metadata.height * 0.2),
            bottom: Math.round(metadata.height * 0.25),
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          })
          .png()
          .toBuffer();
      }

      const finalPath = path.join(destination, filename);
      temporaryPath = `${finalPath}.${crypto.randomUUID()}.tmp`;
      await writeFile(temporaryPath, output);
      await rm(finalPath, { force: true });
      await rename(temporaryPath, finalPath);
      temporaryPath = undefined;
      saved += 1;
    } catch (error) {
      if (temporaryPath) await rm(temporaryPath, { force: true }).catch(() => {});
      failures.push({
        name,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  return json({
    available: true,
    padded,
    destination,
    requested: names.length,
    saved,
    failures,
  }, failures.length === names.length ? 502 : 200);
};
