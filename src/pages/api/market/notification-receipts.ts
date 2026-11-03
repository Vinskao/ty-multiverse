import type { APIRoute } from 'astro';

const MAYA_SAWA_URL = process.env.MAYA_SAWA_INTERNAL_URL || import.meta.env.MAYA_SAWA_INTERNAL_URL || 'http://maya-sawa/maya-sawa';
const proxy: APIRoute = async ({ request }) => {
  const authorization = request.headers.get('authorization');
  if (!authorization?.toLowerCase().startsWith('bearer ')) return Response.json({ detail: 'Bearer token required' }, { status: 401 });
  try {
    const response = await fetch(`${MAYA_SAWA_URL}/market/notification-receipts`, {
      method: request.method, headers: { Authorization: authorization, 'Content-Type': 'application/json' },
      ...(request.method === 'POST' ? { body: await request.text() } : {}), signal: AbortSignal.timeout(15000),
    });
    return new Response(await response.text(), { status: response.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  } catch { return Response.json({ detail: 'Notification receipts unavailable' }, { status: 502 }); }
};
export const GET = proxy;
export const POST = proxy;
