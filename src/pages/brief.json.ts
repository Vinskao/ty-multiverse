import type { APIRoute } from 'astro';
import { getMarketBrief } from '../services/server/marketBrief';

export const GET: APIRoute = async () => {
  const brief = await getMarketBrief('json');
  if (!brief) return Response.json({ error: 'Market brief unavailable' }, { status: 503, headers: { 'Retry-After': '30', 'X-Robots-Tag': 'noindex, nofollow' } });
  return Response.json(brief, { headers: { 'Cache-Control': 'no-cache', 'X-Robots-Tag': 'noindex, nofollow' } });
};
