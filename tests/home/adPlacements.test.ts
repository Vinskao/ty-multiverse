import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('homepage advertising test placements', () => {
  it('has no Adsterra placements anywhere', () => {
    for (const path of ['src/pages/index.astro', 'src/pages/about.astro', 'src/pages/learn.astro', 'src/pages/work.astro', 'src/pages/work/[...slug].astro', 'src/components/ArticleSidebar.astro']) {
      expect(read(path), path).not.toMatch(/HomeAdPlacements|AdsterraSidebarBanner/);
    }
  });

  it('allows article index cards to shrink and wrap on narrow screens', () => {
    const styles = read('src/styles/knowledge.css');
    expect(styles).toContain('.knowledge-library,.knowledge-list,.knowledge-row{box-sizing:border-box;min-width:0;max-width:100%}');
    expect(styles).toContain('grid-template-columns:minmax(0,1fr) 24px');
    expect(styles).toContain('overflow-wrap:anywhere');
  });
});
