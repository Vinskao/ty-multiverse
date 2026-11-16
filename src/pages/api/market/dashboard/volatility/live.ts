import type { APIRoute } from 'astro';

const MAYA_SAWA_URL = process.env.MAYA_SAWA_INTERNAL_URL || import.meta.env.MAYA_SAWA_INTERNAL_URL || 'http://maya-sawa/maya-sawa';

// Live Taiwan VIX (TAIFEX) and U.S. VIX; maya-sawa caches the two sources for 30 seconds.
export const GET: APIRoute = async () => {
  try {
    const response = await fetch(`${MAYA_SAWA_URL}/market/dashboard/volatility/live`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
    return new Response(await response.text(), {
      status: response.status,
      headers: { 'Content-Type': response.headers.get('Content-Type') || 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('Live volatility request failed:', error);
    return Response.json({ error: 'Live volatility unavailable' }, { status: 502 });
  }
};
