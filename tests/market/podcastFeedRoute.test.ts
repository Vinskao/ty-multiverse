import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET } from '../../src/pages/podcast.xml';

const RSS = '<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Birch Investments 每日市場精讀</title></channel></rss>';

describe('public podcast feed route', () => {
  afterEach(() => vi.restoreAllMocks());

  it('serves the backend feed as RSS from the site root so Spotify can subscribe to it', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(RSS, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } }));
    const response = await GET({} as never);
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toMatch(/^application\/rss\+xml/);
    expect(response.headers.get('Cache-Control')).toMatch(/max-age=\d+/);
    expect(await response.text()).toContain('Birch Investments 每日市場精讀');
    expect(fetchSpy).toHaveBeenCalledWith(expect.stringMatching(/\/market\/podcast\.xml$/), expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });

  it('does not hand back an error page or HTML as if it were a feed', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('<html>Bad gateway</html>', { status: 502 }));
    const response = await GET({} as never);
    expect(response.status).toBe(502);
    expect(response.headers.get('Content-Type')).not.toMatch(/rss/);
  });

  it('reports a clean 502 when the backend cannot be reached', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('down'));
    const response = await GET({} as never);
    expect(response.status).toBe(502);
  });
});
