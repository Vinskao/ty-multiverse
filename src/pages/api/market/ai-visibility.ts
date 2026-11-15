import type { APIRoute } from 'astro';

// Owner-only: AI-search visibility dashboard data. Maya Sawa checks the caller's role from the bearer token.
const MAYA_SAWA_URL = process.env.MAYA_SAWA_INTERNAL_URL || import.meta.env.MAYA_SAWA_INTERNAL_URL || 'http://maya-sawa/maya-sawa';

export const GET: APIRoute = async ({ request }) => {
  const authorization = request.headers.get('authorization');
  if (!authorization?.toLowerCase().startsWith('bearer ')) return Response.json({ detail: 'Bearer token required' }, { status: 401 });
  try {
    const response = await fetch(`${MAYA_SAWA_URL}/market/admin/ai-visibility`, {
      headers: { Accept: 'application/json', Authorization: authorization }, signal: AbortSignal.timeout(15000),
    });
    return new Response(response.body, { status: response.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ detail: 'AI visibility unavailable' }, { status: 502 });
  }
};
