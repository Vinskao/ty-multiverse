import type { APIRoute } from 'astro';

const MAYA_SAWA_URL = process.env.MAYA_SAWA_INTERNAL_URL || import.meta.env.MAYA_SAWA_INTERNAL_URL || 'http://maya-sawa/maya-sawa';

export const GET: APIRoute = async ({ url }) => {
  const query = new URLSearchParams(url.searchParams);
  try {
    const response = await fetch(`${MAYA_SAWA_URL}/market/reports/claims?${query}`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(30000) });
    return new Response(response.body, { status: response.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ detail: 'Market report claims unavailable' }, { status: 502 });
  }
};
