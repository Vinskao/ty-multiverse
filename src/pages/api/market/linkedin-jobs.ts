import type { APIRoute } from 'astro';

const maya = process.env.MAYA_SAWA_INTERNAL_URL || import.meta.env.MAYA_SAWA_INTERNAL_URL || 'http://maya-sawa/maya-sawa';

const proxy: APIRoute = async ({ request }) => {
  const authorization = request.headers.get('authorization');
  if (!authorization?.toLowerCase().startsWith('bearer ')) {
    return Response.json({ detail: 'Bearer token required' }, { status: 401 });
  }
  const reviewing = request.method === 'POST';
  try {
    const response = await fetch(`${maya}/market/linkedin-jobs${reviewing ? '/review' : ''}`, {
      method: request.method,
      headers: { Authorization: authorization, 'Content-Type': 'application/json' },
      body: reviewing ? await request.text() : undefined,
      signal: AbortSignal.timeout(15000),
    });
    return new Response(response.body, {
      status: response.status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch {
    return Response.json({ detail: 'Job queue unavailable' }, { status: 502 });
  }
};

export const GET = proxy;
export const POST = proxy;
