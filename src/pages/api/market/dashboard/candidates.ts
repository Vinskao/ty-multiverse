import type { APIRoute } from 'astro';

const MAYA_SAWA_URL = process.env.MAYA_SAWA_INTERNAL_URL || import.meta.env.MAYA_SAWA_INTERNAL_URL || 'http://maya-sawa/maya-sawa';

export const GET: APIRoute = async ({ request }) => {
  const authorization = request.headers.get('authorization');
  if (!authorization?.toLowerCase().startsWith('bearer ')) return Response.json({ detail: 'Bearer token required' }, { status: 401 });
  const query = new URL(request.url).searchParams;
  const target = new URL(`${MAYA_SAWA_URL}/market/dashboard/candidates`);
  query.forEach((value, key) => target.searchParams.set(key, value));
  try {
    const response = await fetch(target, { headers: { Authorization: authorization, Accept: 'application/json' } });
    return new Response(await response.text(), { status: response.status, headers: { 'Content-Type': response.headers.get('Content-Type') || 'application/json' } });
  } catch (error) {
    console.error('Market candidate list failed:', error);
    return Response.json({ error: 'Market candidate list unavailable' }, { status: 502 });
  }
};
