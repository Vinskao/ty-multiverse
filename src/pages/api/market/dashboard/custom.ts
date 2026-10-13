import type { APIRoute } from 'astro';

const MAYA_SAWA_URL = process.env.MAYA_SAWA_INTERNAL_URL || import.meta.env.MAYA_SAWA_INTERNAL_URL || 'http://maya-sawa/maya-sawa';

async function forward(request: Request, method: 'GET' | 'PUT') {
  const authorization = request.headers.get('authorization');
  if (!authorization?.toLowerCase().startsWith('bearer ')) return Response.json({ detail: 'Bearer token required' }, { status: 401 });
  try {
    const response = await fetch(`${MAYA_SAWA_URL}/market/dashboard/custom`, {
      method,
      headers: { Authorization: authorization, Accept: 'application/json', ...(method === 'PUT' ? { 'Content-Type': 'application/json' } : {}) },
      ...(method === 'PUT' ? { body: await request.text() } : {}),
    });
    return new Response(await response.text(), { status: response.status, headers: { 'Content-Type': response.headers.get('Content-Type') || 'application/json' } });
  } catch (error) {
    console.error('Market dashboard settings request failed:', error);
    return Response.json({ error: 'Market dashboard settings unavailable' }, { status: 502 });
  }
}

export const GET: APIRoute = ({ request }) => forward(request, 'GET');
export const PUT: APIRoute = ({ request }) => forward(request, 'PUT');
