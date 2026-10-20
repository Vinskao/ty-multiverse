import type { APIRoute } from 'astro';

const MAYA_SAWA_URL = process.env.MAYA_SAWA_INTERNAL_URL || import.meta.env.MAYA_SAWA_INTERNAL_URL || 'http://maya-sawa/maya-sawa';

export const GET: APIRoute = async ({ request }) => {
  const authorization = request.headers.get('authorization');
  if (!authorization?.toLowerCase().startsWith('bearer ')) return Response.json({ authenticated: false }, { status: 401 });
  try {
    const response = await fetch(`${MAYA_SAWA_URL}/market/auth-status`, { headers: { Authorization: authorization, Accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
    return new Response(await response.text(), { status: response.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ detail: 'Market authentication unavailable' }, { status: 502 });
  }
};
