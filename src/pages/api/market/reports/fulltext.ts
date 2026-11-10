import type { APIRoute } from 'astro';

const MAYA_SAWA_URL = process.env.MAYA_SAWA_INTERNAL_URL || import.meta.env.MAYA_SAWA_INTERNAL_URL || 'http://maya-sawa/maya-sawa';

// Public keyword search over the whole text of public reports (the homepage search box).
export const GET: APIRoute = async ({ url }) => {
  const q = (url.searchParams.get('q') ?? '').slice(0, 200);
  try {
    const response = await fetch(`${MAYA_SAWA_URL}/market/reports/fulltext?${new URLSearchParams({ q })}`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
    return new Response(response.body, { status: response.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ results: [] }, { status: 502 });
  }
};
