import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ params, request }) => {
  const code = params.code?.trim().toUpperCase();
  const market = new URL(request.url).searchParams.get('market')?.toUpperCase();
  if (!code || !/^[A-Z0-9.-]{1,24}$/.test(code) || !['US', 'JP', 'KR', 'HK', 'CRYPTO'].includes(market || '')) {
    return Response.json({ detail: 'Invalid overseas instrument identity' }, { status: 422 });
  }
  const base = process.env.MAYA_SAWA_INTERNAL_URL || 'http://maya-sawa/maya-sawa';
  try {
    const response = await fetch(`${base}/market/dashboard/overseas/${encodeURIComponent(code)}?market=${market}`,
      { headers: { Accept: 'application/json' } });
    return new Response(await response.text(), { status: response.status, headers: {
      'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ detail: 'Persisted overseas data unavailable' }, { status: 502 });
  }
};
