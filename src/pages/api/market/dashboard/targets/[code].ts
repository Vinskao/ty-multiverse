
import type { APIRoute } from 'astro';

const MAYA_SAWA_URL = process.env.MAYA_SAWA_INTERNAL_URL || import.meta.env.MAYA_SAWA_INTERNAL_URL || 'http://maya-sawa/maya-sawa';

// Public read of broker target prices; writes go to maya-sawa directly (owner or the AI routine's agent key).
export const GET: APIRoute = async ({ params, request }) => {
  const code = params.code?.trim().toUpperCase();
  if (!code || !/^[A-Z0-9.-]{1,24}$/.test(code)) return Response.json({ detail: 'Invalid instrument code' }, { status: 422 });
  const market = (new URL(request.url).searchParams.get('market') || 'TW').toUpperCase();
  if (!/^[A-Z]{2}$/.test(market)) return Response.json({ detail: 'Invalid market' }, { status: 422 });
  try {
    const response = await fetch(`${MAYA_SAWA_URL}/market/dashboard/targets/${encodeURIComponent(code)}?market=${market}`,
      { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(20000) });
    return new Response(await response.text(), { status: response.status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Price target request failed:', error);
    return Response.json({ error: 'Price targets unavailable' }, { status: 502 });
  }
};
