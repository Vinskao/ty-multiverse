import type { APIRoute } from 'astro';

const MAYA_SAWA_URL = process.env.MAYA_SAWA_INTERNAL_URL || import.meta.env.MAYA_SAWA_INTERNAL_URL || 'http://maya-sawa/maya-sawa';

export const GET: APIRoute = async ({ params }) => {
  const { productType, code, revision } = params;
  if (!['macro', 'stock'].includes(productType || '') || !/^[A-Z0-9-]{1,24}$/.test(code || '') || !/^\d+$/.test(revision || '')) return new Response(null, { status: 404 });
  try {
    const response = await fetch(`${MAYA_SAWA_URL}/market/audio/${productType}/${encodeURIComponent(code!)}/${revision}`, { signal: AbortSignal.timeout(20000) });
    return new Response(response.body, { status: response.status, headers: { 'Content-Type': response.headers.get('Content-Type') || 'application/octet-stream', 'Cache-Control': 'public, max-age=3600' } });
  } catch {
    return Response.json({ error: 'Market audio unavailable' }, { status: 502 });
  }
};
