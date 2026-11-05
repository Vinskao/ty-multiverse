import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('homepage advertising test placements', () => {
  it('places clearly labelled 300x250 and Native Banner Adsterra slots on the homepage', () => {
    const index = read('src/pages/index.astro');
    const slots = read('src/components/HomeAdPlacements.astro');
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
    expect(slots).toContain('data-monetag-zone="12196776"');
    expect(slots).toContain('id="adsterra-responsive-banner"');
    expect(slots).toContain('data-adsterra="responsive"');
    expect(slots).toContain('data-adsterra="native"');
    expect(slots).toContain('data-monetag-zone="12196776"');
    expect(styles).toContain('.home-advertising-grid');
  });

  it('places the same ad component on About, Learn, and blog listing and article pages', () => {
    for (const path of ['src/pages/about.astro', 'src/pages/learn.astro', 'src/pages/work.astro', 'src/pages/work/[...slug].astro']) {
      expect(read(path), path).toContain('<HomeAdPlacements />');
      expect(read(path), path).toContain("import HomeAdPlacements from");
    }
    expect(read('src/components/ArticleSidebar.astro')).toContain('<AdsterraSidebarBanner />');
  });
});
