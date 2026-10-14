import type { APIRoute } from 'astro';

const MAYA_SAWA_URL = process.env.MAYA_SAWA_INTERNAL_URL || import.meta.env.MAYA_SAWA_INTERNAL_URL || 'http://maya-sawa/maya-sawa';

export const GET: APIRoute = async ({ params, request }) => {
  const code = params.code?.trim().toUpperCase();
  if (!code || !/^[A-Z0-9-]{1,24}$/.test(code)) return Response.json({ detail: 'Invalid instrument code' }, { status: 422 });
  const source = new URL(request.url);
  const target = new URL(`${MAYA_SAWA_URL}/market/dashboard/history/${encodeURIComponent(code)}`);
  source.searchParams.forEach((value, key) => target.searchParams.set(key, value));
  try {
    const response = await fetch(target, { headers: { Accept: 'application/json' } });
    return new Response(await response.text(), {
      status: response.status,
      headers: { 'Content-Type': response.headers.get('Content-Type') || 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('Market history request failed:', error);
    return Response.json({ error: 'Market history unavailable' }, { status: 502 });
  }
};
