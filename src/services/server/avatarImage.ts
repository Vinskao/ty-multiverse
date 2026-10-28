type AvatarImageDependencies = {
  imageBaseUrl: string;
  authUrl?: string;
  fetcher?: typeof fetch;
  blur: (source: Uint8Array) => Promise<Uint8Array>;
};

const isSafeAvatarName = (name: string) =>
  name.length > 0 && name.length <= 120 && /^[\p{L}\p{N} _.'()\-]+$/u.test(name) && name !== '.' && name !== '..';

export function resolveAvatarImageBaseUrl(options: { privateUrl?: string; publicUrl?: string; inCluster: boolean }): string {
  return options.privateUrl?.trim() || (options.inCluster ? 'http://image-server-service/images/people' : options.publicUrl?.trim()) || '';
}

function normalizedImageContentType(declaredType: string, bytes: Uint8Array): string | null {
  if (declaredType.startsWith('image/')) return declaredType;
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
      bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return 'image/png';
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 6 && String.fromCharCode(...bytes.slice(0, 6)).startsWith('GIF8')) return 'image/gif';
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') return 'image/webp';
  return null;
}

const imageResponse = (bytes: Uint8Array, contentType: string) => new Response(
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
  {
  status: 200,
  headers: {
    'Content-Type': contentType,
    'Cache-Control': 'private, no-store, no-cache, max-age=0',
    'Vary': 'Authorization',
    'X-Content-Type-Options': 'nosniff',
  },
  },
);

/** Returns original avatar bytes only for a token accepted by the backend; all other requests get a raster blur. */
export async function createAvatarImageResponse(
  name: string,
  authorization: string | null,
  dependencies: AvatarImageDependencies,
): Promise<Response> {
  if (!isSafeAvatarName(name)) return Response.json({ error: 'Invalid avatar name' }, { status: 400 });
  if (!dependencies.imageBaseUrl) return Response.json({ error: 'Avatar source unavailable' }, { status: 503 });

  const fetcher = dependencies.fetcher ?? fetch;
  let authenticated = false;
  if (authorization?.toLowerCase().startsWith('bearer ') && dependencies.authUrl) {
    try {
      const authResponse = await fetcher(dependencies.authUrl, {
        headers: { Authorization: authorization },
        redirect: 'manual',
        signal: typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(10_000) : undefined,
      });
      authenticated = authResponse.ok;
    } catch {
      // Fail closed: backend verification trouble must never disclose the original.
    }
  }

  try {
    const sourceUrl = `${dependencies.imageBaseUrl.replace(/\/+$/, '')}/${encodeURIComponent(name)}.png`;
    const upstream = await fetcher(sourceUrl, {
      headers: { Accept: 'image/png,image/*;q=0.8' },
      redirect: 'error',
      signal: typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(15_000) : undefined,
    });
    if (!upstream.ok) return Response.json({ error: 'Avatar not found' }, { status: 404 });
    const source = new Uint8Array(await upstream.arrayBuffer());
    const contentType = normalizedImageContentType(upstream.headers.get('content-type')?.split(';')[0] ?? '', source);
    if (!contentType) return Response.json({ error: 'Invalid avatar response' }, { status: 502 });
    if (authenticated) return imageResponseFromSource(source, contentType);
    return imageResponse(await dependencies.blur(source), 'image/webp');
  } catch {
    return Response.json({ error: 'Avatar service unavailable' }, { status: 502 });
  }
}

function imageResponseFromSource(bytes: Uint8Array, contentType: string) {
  return imageResponse(bytes, contentType);
}
