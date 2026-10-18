import type { APIRoute } from 'astro';

const MAYA_SAWA_URL = process.env.MAYA_SAWA_INTERNAL_URL || import.meta.env.MAYA_SAWA_INTERNAL_URL || 'http://maya-sawa/maya-sawa';

// Every stored research map, including instruments no longer held.
export const GET: APIRoute = async () => {
  try {
    const response = await fetch(`${MAYA_SAWA_URL}/market/dashboard/research`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(20000) });
    return new Response(await response.text(), { status: response.status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ detail: 'Research maps are unavailable' }, { status: 503 });
  }
};
