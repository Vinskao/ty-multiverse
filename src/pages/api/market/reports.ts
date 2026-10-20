import type { APIRoute } from 'astro';

const MAYA_SAWA_URL = process.env.MAYA_SAWA_INTERNAL_URL || import.meta.env.MAYA_SAWA_INTERNAL_URL || 'http://maya-sawa/maya-sawa';

export const GET: APIRoute = async ({ request }) => proxy(request, 'GET');

export const POST: APIRoute = async ({ request }) => {
  const authorization = request.headers.get('authorization');
  if (!authorization?.toLowerCase().startsWith('bearer ')) return Response.json({ detail: 'Bearer token required' }, { status: 401 });
  return proxy(request, 'POST');
};

async function proxy(request: Request, method: 'GET' | 'POST'): Promise<Response> {
  const authorization = request.headers.get('authorization');
  const headers = new Headers({ Accept: 'application/json' });
  if (authorization) headers.set('Authorization', authorization);
  if (method === 'POST') {
    const contentType = request.headers.get('content-type');
    if (contentType) headers.set('Content-Type', contentType);
  }
  try {
    const response = await fetch(`${MAYA_SAWA_URL}/market/reports`, {
      method,
      headers,
      ...(method === 'POST' ? { body: request.body, duplex: 'half' } : {}),
      signal: AbortSignal.timeout(method === 'POST' ? 180000 : 30000),
    } as RequestInit & { duplex?: 'half' });
    const responseHeaders = new Headers({ 'Cache-Control': 'no-store' });
    for (const name of ['Content-Type', 'Content-Disposition']) {
      const value = response.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    return new Response(response.body, { status: response.status, headers: responseHeaders });
  } catch {
    return Response.json({ detail: 'Market report service unavailable' }, { status: 502 });
  }
}
