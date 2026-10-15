import type { APIRoute } from 'astro';

const MAYA_SAWA_URL = process.env.MAYA_SAWA_INTERNAL_URL || import.meta.env.MAYA_SAWA_INTERNAL_URL || 'http://maya-sawa/maya-sawa';

async function forward(request: Request, code: string | undefined, method: 'GET' | 'PUT') {
  if (!code || !/^[A-Z0-9-]{1,24}$/i.test(code)) return Response.json({ detail: 'Invalid instrument code' }, { status: 422 });
  const kind = new URL(request.url).searchParams.get('productType') || 'stock';
  if (!['stock', 'futures'].includes(kind)) return Response.json({ detail: 'Invalid productType' }, { status: 422 });
  const authorization = request.headers.get('authorization');
  if (method === 'PUT' && !authorization?.toLowerCase().startsWith('bearer ')) {
    return Response.json({ detail: 'Sign in to update AI analysis' }, { status: 401 });
  }
  try {
    const response = await fetch(`${MAYA_SAWA_URL}/market/dashboard/analysis/${encodeURIComponent(code.toUpperCase())}?productType=${kind}`, {
      method, signal: AbortSignal.timeout(20000),
      headers: { Accept: 'application/json', ...(method === 'PUT' ? { Authorization: authorization!, 'Content-Type': 'application/json' } : {}) },
      ...(method === 'PUT' ? { body: await request.text() } : {}),
    });
    return new Response(await response.text(), { status: response.status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ detail: 'AI analysis service is unavailable; your draft has not been saved' }, { status: 503 });
  }
}

export const GET: APIRoute = ({ request, params }) => forward(request, params.code, 'GET');
export const PUT: APIRoute = ({ request, params }) => forward(request, params.code, 'PUT');
