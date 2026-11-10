import type { APIRoute } from 'astro';

// Owner-only: weekly returning research readers. Maya Sawa checks the caller's role from the bearer token.
const MAYA_SAWA_URL = process.env.MAYA_SAWA_INTERNAL_URL || import.meta.env.MAYA_SAWA_INTERNAL_URL || 'http://maya-sawa/maya-sawa';

export const GET: APIRoute = async ({ request, url }) => {
  const authorization = request.headers.get('authorization');
  if (!authorization?.toLowerCase().startsWith('bearer ')) return Response.json({ detail: 'Bearer token required' }, { status: 401 });
  const weeks = Math.max(1, Math.min(26, Number(url.searchParams.get('weeks')) || 8));
  try {
    const response = await fetch(`${MAYA_SAWA_URL}/market/admin/north-star?weeks=${weeks}`, {
      headers: { Accept: 'application/json', Authorization: authorization }, signal: AbortSignal.timeout(15000),
    });
    return new Response(response.body, { status: response.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ detail: 'North star unavailable' }, { status: 502 });
  }
};
