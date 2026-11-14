import { beforeEach, describe, expect, it, vi } from 'vitest';

const { readBlog } = vi.hoisted(() => ({ readBlog: vi.fn() }));
vi.mock('../../src/services/server/blog', () => ({ readBlog }));

import { GET } from '../../src/pages/sitemap.xml';

describe('SSR sitemap route', () => {
  beforeEach(() => {
    readBlog.mockReset();
    readBlog.mockResolvedValue([]);
  });

  it('lists public landing pages and valid article slugs, with crawl-friendly headers', async () => {
    readBlog.mockResolvedValue([
      { id: 'seo-guide' },
      { id: 'macro-research-2026' },
      { id: '../admin' },
      { id: 'has spaces' },
      { title: 'missing slug' },
    ]);

    const response = await GET({} as never);
    const xml = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/xml');
    expect(response.headers.get('cache-control')).toContain('max-age=3600');
    expect(xml).toContain('<loc>https://tymultiverse.cc/</loc>');
    expect(xml).toContain('<loc>https://tymultiverse.cc/work/seo-guide</loc>');
    expect(xml).toContain('<loc>https://tymultiverse.cc/work/macro-research-2026</loc>');
    expect(xml).not.toContain('admin');
    expect(xml).not.toContain('has%20spaces');
  });

  // 2026-11-14: a restarting Maya left the live sitemap with no articles; the last loaded list is kept.
  it('keeps core public URLs and the last loaded articles when the article service is unavailable', async () => {
    readBlog.mockRejectedValue(new Error('article service unavailable'));

    const response = await GET({} as never);
    const xml = await response.text();

    expect(response.status).toBe(200);
    expect(xml).toContain('<loc>https://tymultiverse.cc/about</loc>');
    expect(xml).toContain('<loc>https://tymultiverse.cc/api-reference</loc>');
    expect(xml).toContain('<loc>https://tymultiverse.cc/work/seo-guide</loc>');
  });
});
