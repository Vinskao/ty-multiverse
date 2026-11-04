import type { APIRoute } from 'astro';

const MAYA_SAWA_URL = process.env.MAYA_SAWA_INTERNAL_URL || import.meta.env.MAYA_SAWA_INTERNAL_URL || 'http://maya-sawa/maya-sawa';

export const GET: APIRoute = async () => {
  try {
    const response = await fetch(`${MAYA_SAWA_URL}/market/audio`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10000) });
    const body = await response.json();
    return Response.json(body, { status: response.status, headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'Market audio unavailable' }, { status: 502 });
  }
};
