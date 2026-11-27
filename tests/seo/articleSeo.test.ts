import { describe, expect, it } from 'vitest';
import { articleStructuredData, isDailyReading } from '../../src/scripts/seo/articleSeo';

describe('article SEO', () => {
  it('recognises daily readings by id or tag', () => {
    expect(isDailyReading({ id: 'daily-reading-2026-11-27' })).toBe(true);
    expect(isDailyReading({ id: 'x', tags: ['Daily Reading'] })).toBe(true);
    expect(isDailyReading({ id: 'redis', tags: ['Redis'] })).toBe(false);
  });
  it('describes an article with author and publisher', () => {
    const data = articleStructuredData({ title: 'Redis', description: 'd', publishDate: '2026-10-01T00:00:00Z', tags: ['a', 'b'] }, 'redis');
    expect(data['@type']).toBe('Article');
    expect(data.mainEntityOfPage).toBe('https://tymultiverse.cc/work/redis');
    expect(data.author.name).toBe('TY');
    expect(data.keywords).toBe('a, b');
  });
});

import { readFileSync } from 'node:fs';
describe('AdSense content pages', () => {
  const read = (p: string) => readFileSync(p, 'utf8');
  it('has a contact page that is linked from the footer and sitemap, with no ads on it', () => {
    expect(read('src/pages/contact.astro')).toContain('mailto:');
    expect(read('src/components/Footer.astro')).toContain("'/contact/'");
    expect(read('src/pages/sitemap.xml.ts')).toContain("'/contact'");
    expect(read('src/scripts/ads/placement.ts')).toContain('contact');
  });
  it('keeps daily readings out of search and the sitemap but gives other articles structured data', () => {
    expect(read('src/pages/sitemap.xml.ts')).toContain('!isDailyReading(article)');
    const page = read('src/pages/work/[...slug].astro');
    expect(page).toContain('!isDailyReading(');
    expect(page).toContain('articleStructuredData');
  });
  it('discloses the ad providers on the privacy page', () => {
    const privacy = read('src/pages/privacy.astro');
    expect(privacy).toContain('Google AdSense');
    expect(privacy).toContain('Monetag');
  });
});
