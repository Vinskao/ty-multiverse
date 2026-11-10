import type { APIRoute } from 'astro';
import { readerEventPayload } from '../../../scripts/analytics/readerEvents';

// Anonymous reader events for the north star metric (docs/NORTH_STAR.md). The browser posts here; this server adds
// the internal secret and passes on only the random id, the event and its target, nothing about the request itself.
const MAYA_SAWA_URL = process.env.MAYA_SAWA_INTERNAL_URL || import.meta.env.MAYA_SAWA_INTERNAL_URL || 'http://maya-sawa/maya-sawa';
const INTERNAL_SECRET = process.env.MARKET_INTERNAL_SECRET || import.meta.env.MARKET_INTERNAL_SECRET;
const MAX_BODY = 1024;

export const POST: APIRoute = async ({ request }) => {
  const text = await request.text().catch(() => '');
  let body: unknown = null;
  try { body = text.length <= MAX_BODY ? JSON.parse(text) : null; } catch { body = null; }
  const payload = readerEventPayload(body);
  if (!payload) return new Response(null, { status: 400 });
  // The reader gets the same answer whether or not the count was stored; measuring never blocks the page.
  if (INTERNAL_SECRET) {
    await fetch(`${MAYA_SAWA_URL}/market/internal/reader-events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Internal-Secret': INTERNAL_SECRET },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    }).catch(() => null);
  }
  return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
};
