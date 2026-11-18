import type { APIRoute } from 'astro';

const MAYA_SAWA_URL = process.env.MAYA_SAWA_INTERNAL_URL || import.meta.env.MAYA_SAWA_INTERNAL_URL || 'http://maya-sawa/maya-sawa';

// The owner takes a stock the AI found out of the custom area (the AI watch list is not part of the PUT /custom selection).
export const DELETE: APIRoute = async ({ params, request }) => {
  const authorization = request.headers.get('authorization');
  if (!authorization?.toLowerCase().startsWith('bearer ')) return Response.json({ detail: 'Bearer token required' }, { status: 401 });
  const code = params.code?.trim().toUpperCase();
  if (!code || !/^[A-Z0-9.-]{1,24}$/.test(code)) return Response.json({ detail: 'Invalid instrument code' }, { status: 422 });
  try {
    const response = await fetch(`${MAYA_SAWA_URL}/market/watch/${encodeURIComponent(code)}`,
      { method: 'DELETE', headers: { Authorization: authorization, Accept: 'application/json' }, signal: AbortSignal.timeout(20000) });
    return new Response(await response.text(), { status: response.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Watch removal failed:', error);
    return Response.json({ error: 'Watch list unavailable' }, { status: 502 });
  }
};
