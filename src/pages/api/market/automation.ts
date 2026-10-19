import type { APIRoute } from 'astro';

const MAYA_SAWA_URL = process.env.MAYA_SAWA_INTERNAL_URL || import.meta.env.MAYA_SAWA_INTERNAL_URL || 'http://maya-sawa/maya-sawa';

// Owner-only: report the IB session and let maya-sawa fire the AI-analysis routines that are due.
export const POST: APIRoute = async ({ request }) => {
  const authorization = request.headers.get('authorization');
  if (!authorization?.toLowerCase().startsWith('bearer ')) return Response.json({ detail: 'Bearer token required' }, { status: 401 });
  try {
    const response = await fetch(`${MAYA_SAWA_URL}/market/automation/check`, {
      method: 'POST', signal: AbortSignal.timeout(45000),
      headers: { Authorization: authorization, Accept: 'application/json' },
    });
    return new Response(await response.text(), { status: response.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ detail: 'Market automation unavailable' }, { status: 502 });
  }
};
