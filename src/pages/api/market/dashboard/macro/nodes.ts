import type { APIRoute } from 'astro';

const MAYA_SAWA_URL = process.env.MAYA_SAWA_INTERNAL_URL || import.meta.env.MAYA_SAWA_INTERNAL_URL || 'http://maya-sawa/maya-sawa';

// Every macro logic-chain node's analysis (productType=macro-node), read in one request.
export const GET: APIRoute = async () => {
  try {
    const response = await fetch(`${MAYA_SAWA_URL}/market/dashboard/macro/nodes`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(20000) });
    return new Response(await response.text(), {
      status: response.status,
      headers: { 'Content-Type': response.headers.get('Content-Type') || 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('Macro node analyses request failed:', error);
    return Response.json({ error: 'Macro node analyses unavailable' }, { status: 502 });
  }
};
