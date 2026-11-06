import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('homepage advertising test placements', () => {
  it('keeps disruptive In-Page Push off the homepage and reserves it for Learn', () => {
    const index = read('src/pages/index.astro');
    const slots = read('src/components/HomeAdPlacements.astro');
    const push = read('src/components/MonetagInPagePush.astro');
    const styles = read('src/styles/index.css');
    const loader = read('src/scripts/ads/consentAds.ts');

    expect(index).toContain('<HomeAdPlacements />');
    expect(slots).toContain('aria-labelledby="home-advertising-title"');
    expect(slots).toContain('id="adsterra-300x250"');
    expect(slots).toContain('id="container-06e9cf3d5469a7e1c33e98da08c56876"');
    expect(loader).toContain('2143d97a1a273993069cffe00f798381');
    expect(loader).toContain('06e9cf3d5469a7e1c33e98da08c56876');
    expect(loader).toContain('https://bauval.org/22/');
    expect(loader).toContain('https://bauval.org/21/');
    expect(loader).toContain('https://nap5k.com/tag.min.js');
    expect(index).not.toContain('<MonetagInPagePush />');
    expect(slots).not.toContain('data-monetag-zone="12196776"');
    expect(read('src/pages/learn.astro')).toContain('<MonetagInPagePush />');
    expect(push).toContain('data-monetag-zone="12196776"');
    expect(slots).toContain('id="adsterra-responsive-banner"');
    expect(slots).toContain('data-adsterra="responsive"');
    expect(slots).toContain('data-adsterra="native"');
    expect(styles).toContain('.home-advertising-grid');
  });

  it('places the same ad component on About, Learn, and blog listing and article pages', () => {
    for (const path of ['src/pages/about.astro', 'src/pages/learn.astro', 'src/pages/work.astro', 'src/pages/work/[...slug].astro']) {
      expect(read(path), path).toContain('<HomeAdPlacements />');
      expect(read(path), path).toContain("import HomeAdPlacements from");
    }
    expect(read('src/components/ArticleSidebar.astro')).toContain('<AdsterraSidebarBanner />');
  });

  it('allows article index cards to shrink and wrap on narrow screens', () => {
    const styles = read('src/styles/knowledge.css');
    expect(styles).toContain('.knowledge-library,.knowledge-list,.knowledge-row{box-sizing:border-box;min-width:0;max-width:100%}');
    expect(styles).toContain('grid-template-columns:minmax(0,1fr) 24px');
    expect(styles).toContain('overflow-wrap:anywhere');
  });

  it('keeps article ads outside the sticky sidebar grid and adds a top banner above the article', () => {
    const page = read('src/pages/work/[...slug].astro');
    const gridEnd = page.search(/<\/div>\r?\n  <HomeAdPlacements \/>/);
    expect(gridEnd).toBeGreaterThan(-1);
    expect(page.indexOf('<HomeAdPlacements compact />')).toBeGreaterThan(page.indexOf('class="knowledge-article"'));
    expect(page.indexOf('<HomeAdPlacements compact />')).toBeLessThan(page.indexOf('<header class="knowledge-header">'));
    expect(read('src/components/HomeAdPlacements.astro')).toContain('id="adsterra-article-top-banner"');
  });

  it('gives index, blog list and learn a second (compact) ad at the top', () => {
    for (const path of ['src/pages/index.astro', 'src/pages/work.astro', 'src/pages/learn.astro']) {
      const page = read(path);
      expect(page, path).toContain('<HomeAdPlacements compact />');
      expect(page, path).toMatch(/<HomeAdPlacements \/>/);
    }
  });
});
