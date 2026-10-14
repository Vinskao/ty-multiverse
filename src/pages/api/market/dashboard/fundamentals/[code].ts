import type { APIRoute } from 'astro';

const MAYA_SAWA_URL = process.env.MAYA_SAWA_INTERNAL_URL || import.meta.env.MAYA_SAWA_INTERNAL_URL || 'http://maya-sawa/maya-sawa';

export const GET: APIRoute = async ({ params }) => {
  const code = String(params.code || '').toUpperCase();
  if (!/^\d{4}$/.test(code)) return Response.json({ detail: 'A four-digit stock code is required' }, { status: 422 });
  try {
    const response = await fetch(`${MAYA_SAWA_URL}/market/dashboard/fundamentals/${encodeURIComponent(code)}`, {
      headers: { Accept: 'application/json' },
    });
    return new Response(await response.text(), {
      status: response.status,
      headers: { 'Content-Type': response.headers.get('Content-Type') || 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('Market fundamentals request failed:', error);
    return Response.json({ error: 'Market fundamentals unavailable' }, { status: 502 });
  }
};
