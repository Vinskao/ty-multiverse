import type { APIRoute } from 'astro';

const MAYA_SAWA_URL = process.env.MAYA_SAWA_INTERNAL_URL || import.meta.env.MAYA_SAWA_INTERNAL_URL || 'http://maya-sawa/maya-sawa';
const INTERNAL_SECRET = process.env.MARKET_INTERNAL_SECRET || import.meta.env.MARKET_INTERNAL_SECRET;

/** Public chart data is deliberately reduced to date + percentage return; account values never leave the server. */
export const GET: APIRoute = async () => {
  if (!INTERNAL_SECRET) return Response.json({ error: 'Internal secret not configured' }, { status: 503 });
  try {
    const response = await fetch(`${MAYA_SAWA_URL}/market/internal/portfolio/history?limit=1830`, {
      headers: { 'X-Internal-Secret': INTERNAL_SECRET, Accept: 'application/json' },
    });
    if (!response.ok) return Response.json({ error: 'Portfolio return history unavailable' }, { status: response.status });
    const payload = await response.json() as { history?: Array<{ date?: string; totalAssets?: number }> };
    const rows = (payload.history ?? []).filter(row => typeof row.date === 'string' && Number.isFinite(row.totalAssets) && row.totalAssets! > 0)
      .sort((a, b) => a.date!.localeCompare(b.date!));
    const baseline = rows[0]?.totalAssets;
    const history = baseline ? rows.map(row => ({
      date: row.date!,
      returnPercent: Math.round(((row.totalAssets! / baseline) - 1) * 1_000_000) / 10_000,
    })) : [];
    return Response.json({ history });
  } catch (error) {
    console.error('Error fetching public portfolio return history:', error);
    return Response.json({ error: 'Portfolio return history unavailable' }, { status: 502 });
  }
};
