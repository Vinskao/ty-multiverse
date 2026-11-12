import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  const base = process.env.MAYA_SAWA_INTERNAL_URL || 'http://maya-sawa/maya-sawa';
  try {
    const response = await fetch(`${base}/market/benchmark/monitor`, { signal: AbortSignal.timeout(15000) });
    return new Response(await response.text(), { status: response.status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  } catch { return Response.json({ detail: 'Benchmark monitor unavailable' }, { status: 502 }); }
};
