import type { APIRoute } from 'astro';

const MAYA_SAWA_URL = process.env.MAYA_SAWA_INTERNAL_URL || import.meta.env.MAYA_SAWA_INTERNAL_URL || 'http://maya-sawa/maya-sawa';

export const GET: APIRoute = async ({ request, params, url }) => proxy(request, params.id!, url.searchParams.get('download') === 'true' ? 'download' : 'detail');
export const DELETE: APIRoute = async ({ request, params }) => proxy(request, params.id!, 'delete');

async function proxy(request: Request, id: string, action: 'download' | 'detail' | 'delete'): Promise<Response> {
  const authorization = request.headers.get('authorization');
  if ((action !== 'detail' || authorization) && !authorization?.toLowerCase().startsWith('bearer ')) {
    return Response.json({ detail: 'Bearer token required' }, { status: 401 });
  }
  const headers = new Headers({ Accept: action === 'download' ? 'application/pdf' : 'application/json' });
  if (authorization) headers.set('Authorization', authorization);
  try {
    const response = await fetch(`${MAYA_SAWA_URL}/market/reports/${encodeURIComponent(id)}${action === 'download' ? '?download=true' : ''}`, {
      method: action === 'delete' ? 'DELETE' : 'GET', headers, signal: AbortSignal.timeout(30000),
    });
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
