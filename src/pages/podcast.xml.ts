import type { APIRoute } from 'astro';

const MAYA_SAWA_URL = process.env.MAYA_SAWA_INTERNAL_URL || import.meta.env.MAYA_SAWA_INTERNAL_URL || 'http://maya-sawa/maya-sawa';

/**
 * Public podcast feed (https://tymultiverse.cc/podcast.xml). Spotify and other directories poll this URL, so new
 * approved daily readings show up without any upload API. The backend builds the XML; this route only exposes it.
 */
export const GET: APIRoute = async () => {
  try {
    const response = await fetch(`${MAYA_SAWA_URL}/market/podcast.xml`, { headers: { Accept: 'application/rss+xml' }, signal: AbortSignal.timeout(10000) });
    if (!response.ok) return Response.json({ error: 'Podcast feed unavailable' }, { status: 502 });
    return new Response(await response.text(), {
      status: 200,
      headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
    });
  } catch {
    return Response.json({ error: 'Podcast feed unavailable' }, { status: 502 });
  }
};
