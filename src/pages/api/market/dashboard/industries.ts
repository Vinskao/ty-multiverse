import type { APIRoute } from 'astro';

const MAYA_SAWA_URL = process.env.MAYA_SAWA_INTERNAL_URL || import.meta.env.MAYA_SAWA_INTERNAL_URL || 'http://maya-sawa/maya-sawa';

// Industry groups (族群) and their member stocks; ?code= returns only the groups that stock belongs to.
export const GET: APIRoute = async ({ request }) => {
  const code = new URL(request.url).searchParams.get('code');
  if (code !== null && !/^[A-Z0-9]{1,12}(-[A-Z]{2})?$/i.test(code)) return Response.json({ detail: 'Invalid record code' }, { status: 422 });
  try {
    const query = code ? `?code=${encodeURIComponent(code.toUpperCase())}` : '';
    const response = await fetch(`${MAYA_SAWA_URL}/market/dashboard/industries${query}`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(20000) });
    return new Response(await response.text(), { status: response.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ detail: 'Industry groups are unavailable' }, { status: 503 });
  }
};
