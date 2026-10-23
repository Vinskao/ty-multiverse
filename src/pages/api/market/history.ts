import type { APIRoute } from 'astro';

const MAYA_SAWA_URL = process.env.MAYA_SAWA_INTERNAL_URL || import.meta.env.MAYA_SAWA_INTERNAL_URL || 'http://maya-sawa/maya-sawa';
const INTERNAL_SECRET = process.env.MARKET_INTERNAL_SECRET || import.meta.env.MARKET_INTERNAL_SECRET;

export const GET: APIRoute = async ({ request }) => {
  const authorization = request.headers.get('authorization');
  if (!authorization?.toLowerCase().startsWith('bearer ')) {
    return Response.json({ detail: 'Bearer token required' }, { status: 401 });
  }
  if (!INTERNAL_SECRET) {
    return Response.json({ error: 'Internal secret not configured' }, { status: 503 });
  }

  try {
    const authResponse = await fetch(`${MAYA_SAWA_URL}/market/auth-status`, {
      headers: { Authorization: authorization, Accept: 'application/json' },
    });
    if (!authResponse.ok) {
      return new Response(await authResponse.text(), {
        status: authResponse.status,
        headers: { 'Content-Type': authResponse.headers.get('Content-Type') || 'application/json' },
      });
    }
    const response = await fetch(`${MAYA_SAWA_URL}/market/internal/portfolio/history?limit=1830`, {
      headers: { 'X-Internal-Secret': INTERNAL_SECRET, Accept: 'application/json' },
    });
    return new Response(await response.text(), {
      status: response.status,
      headers: { 'Content-Type': response.headers.get('Content-Type') || 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching portfolio history from maya-sawa:', error);
    return Response.json({ error: 'Failed to fetch portfolio history' }, { status: 502 });
  }
};
