import type { APIRoute } from 'astro';

const MAYA_SAWA_URL = process.env.MAYA_SAWA_INTERNAL_URL || import.meta.env.MAYA_SAWA_INTERNAL_URL || 'http://maya-sawa/maya-sawa';

/** Phones treat a response without Content-Length / byte ranges as a live stream ("現場直播"), so serve a fixed-length body. */
function ranged(bytes: Uint8Array, contentType: string, range: string | null): Response {
  const base = { 'Content-Type': contentType, 'Accept-Ranges': 'bytes', 'Cache-Control': 'public, max-age=3600' };
  const total = bytes.byteLength;
  const match = range ? /^bytes=(\d*)-(\d*)$/.exec(range.trim()) : null;
  if (!match || (match[1] === '' && match[2] === '')) {
    return new Response(bytes, { status: 200, headers: { ...base, 'Content-Length': String(total) } });
  }
  let start: number;
  let end: number;
  if (match[1] === '') { start = Math.max(0, total - Number(match[2])); end = total - 1; }
  else { start = Number(match[1]); end = match[2] === '' ? total - 1 : Math.min(Number(match[2]), total - 1); }
  if (start >= total || start > end) return new Response(null, { status: 416, headers: { ...base, 'Content-Range': `bytes */${total}` } });
  const part = bytes.slice(start, end + 1);
  return new Response(part, { status: 206, headers: { ...base, 'Content-Range': `bytes ${start}-${end}/${total}`, 'Content-Length': String(part.byteLength) } });
}

export const GET: APIRoute = async ({ params, request }) => {
  const { productType, code, revision } = params;
  const validCode = productType === 'daily'
    ? /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(code || '')
    : ['macro', 'stock'].includes(productType || '') && /^[A-Z0-9-]{1,24}$/.test(code || '');
  if (!validCode || !/^\d+$/.test(revision || '')) return new Response(null, { status: 404 });
  try {
    const response = await fetch(`${MAYA_SAWA_URL}/market/audio/${productType}/${encodeURIComponent(code!)}/${revision}`, { signal: AbortSignal.timeout(20000) });
    if (!response.ok) return new Response(response.body, { status: response.status, headers: { 'Content-Type': response.headers.get('Content-Type') || 'application/octet-stream' } });
    const bytes = new Uint8Array(await response.arrayBuffer());
    return ranged(bytes, response.headers.get('Content-Type') || 'application/octet-stream', request?.headers.get('Range') ?? null);
  } catch {
    return Response.json({ error: 'Market audio unavailable' }, { status: 502 });
  }
};
