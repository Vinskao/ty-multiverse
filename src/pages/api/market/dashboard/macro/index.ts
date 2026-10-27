import type { APIRoute } from 'astro';

const MAYA_SAWA_URL = process.env.MAYA_SAWA_INTERNAL_URL || import.meta.env.MAYA_SAWA_INTERNAL_URL || 'http://maya-sawa/maya-sawa';

export const GET: APIRoute = async ({ url }) => {
  try {
    const historyMonths = Math.min(60, Math.max(12, Number(url.searchParams.get('historyMonths') || 24)));
    const response = await fetch(`${MAYA_SAWA_URL}/market/dashboard/macro?historyMonths=${historyMonths}`, {
      headers: { Accept: 'application/json' },
    });
    return new Response(await response.text(), {
      status: response.status,
      headers: { 'Content-Type': response.headers.get('Content-Type') || 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('Market macro dashboard request failed:', error);
    return Response.json({ error: 'Macroeconomic data unavailable' }, { status: 502 });
  }
};
