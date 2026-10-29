import type { APIRoute } from 'astro';

const MAYA_SAWA_URL = process.env.MAYA_SAWA_INTERNAL_URL || import.meta.env.MAYA_SAWA_INTERNAL_URL || 'http://maya-sawa/maya-sawa';

/** What the scheduled routines sent to Telegram. Anyone gets the updates; the backend adds 'attention' rows for the owner's token. */
export const GET: APIRoute = async ({ request, url }) => {
  const authorization = request.headers.get('authorization');
  const limit = Math.max(1, Math.min(Number(url.searchParams.get('limit')) || 100, 200));
  try {
    const response = await fetch(`${MAYA_SAWA_URL}/market/notifications?limit=${limit}`, { headers: { ...(authorization?.toLowerCase().startsWith('bearer ') ? { Authorization: authorization } : {}), Accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
    return new Response(await response.text(), { status: response.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ detail: 'Notification history unavailable' }, { status: 502 });
  }
};
