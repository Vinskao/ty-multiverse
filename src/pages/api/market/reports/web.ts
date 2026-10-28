import type { APIRoute } from 'astro';

const MAYA_SAWA_URL = process.env.MAYA_SAWA_INTERNAL_URL || import.meta.env.MAYA_SAWA_INTERNAL_URL || 'http://maya-sawa/maya-sawa';

/** Owner only (the backend checks the role): add an SEC EDGAR filing, as reports, from its URL. */
export const POST: APIRoute = async ({ request }) => {
  const authorization = request.headers.get('authorization');
  if (!authorization?.toLowerCase().startsWith('bearer ')) return Response.json({ detail: 'Bearer token required' }, { status: 401 });
  try {
    const response = await fetch(`${MAYA_SAWA_URL}/market/reports/web`, {
      method: 'POST',
      headers: { Authorization: authorization, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: await request.text(),
      signal: AbortSignal.timeout(180000),
    });
    return new Response(await response.text(), { status: response.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ detail: 'Market report service unavailable' }, { status: 502 });
  }
};
