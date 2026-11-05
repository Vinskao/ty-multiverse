import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildSitemapXml, resolvePageMetadata } from '../../src/scripts/seo/siteMetadata';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('technical SEO metadata', () => {
  it('uses the production origin and removes tracking and language query parameters from canonical URLs', () => {
    expect(resolvePageMetadata('/about/?lang=zh&utm_source=test')).toEqual({
      canonical: 'https://tymultiverse.cc/about/',
      robots: 'index,follow,max-image-preview:large',
    });
  });

  it('does not emit canonical URLs for pages explicitly excluded from indexing', () => {
    expect(resolvePageMetadata('/work/manage', { indexable: false })).toEqual({
      canonical: undefined,
      robots: 'noindex,follow',
    });
  });

  it('rejects a canonical URL on a different origin', () => {
    expect(() => resolvePageMetadata('/about', { canonical: 'https://example.com/about' })).toThrow(/same origin/i);
  });

  it('builds a sitemap with unique canonical URLs and escapes XML characters', () => {
    const xml = buildSitemapXml(['/','/about/','/about/','/work/a&b']);
    expect(xml).toContain('<loc>https://tymultiverse.cc/</loc>');
    expect(xml).toContain('<loc>https://tymultiverse.cc/work/a&amp;b</loc>');
    expect(xml.match(/<loc>/g)).toHaveLength(3);
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
  });

  it('publishes complete share metadata and a large social preview image', () => {
    const head = read('src/components/MainHead.astro');
    expect(head).toContain('property="og:site_name"');
    expect(head).toContain('property="og:image"');
    expect(head).toContain('name="twitter:card" content="summary_large_image"');
    expect(head).toContain('name="robots"');
    expect((head + read('src/layouts/BaseLayout.astro')).match(/name="viewport"/g)).toHaveLength(1);
  });

  it('includes the Monetag website verification tag in the shared head', () => {
    expect(read('src/components/MainHead.astro')).toContain(
      '<meta name="monetag" content="c55e19a2bd74503d47acba679da8d1a9" />',
    );
  });

  it('serves a sitemap for this SSR site and points robots.txt at it', () => {
    expect(read('src/pages/sitemap.xml.ts')).toContain('buildSitemapXml');
    expect(read('src/pages/sitemap.xml.ts')).toContain("readBlog()");
    expect(read('public/robots.txt')).toContain('Sitemap: https://tymultiverse.cc/sitemap.xml');
    expect(read('astro.config.ts')).toContain("site: 'https://tymultiverse.cc'");
    expect(read('astro.config.ts')).not.toContain('sitemap()');
  });

  it('marks account, admin, redirect, and error pages as non-indexable', () => {
    for (const path of [
      'src/pages/people-management.astro', 'src/pages/palais.astro', 'src/pages/runpod-cost.astro',
      'src/pages/ai-usage.astro', 'src/pages/work/manage.astro', 'src/pages/404.astro',
    ]) expect(read(path), path).toContain('indexable={false}');
    expect(read('src/pages/login.astro')).toContain('noindex,nofollow');
  });
});
