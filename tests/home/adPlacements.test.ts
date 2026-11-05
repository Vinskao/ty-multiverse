import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('homepage advertising test placements', () => {
  it('places clearly labelled 300x250 and Native Banner Adsterra slots on the homepage', () => {
    const index = read('src/pages/index.astro');
    const slots = read('src/components/HomeAdPlacements.astro');
    const styles = read('src/styles/index.css');

    expect(index).toContain('<HomeAdPlacements />');
    expect(slots).toContain('aria-labelledby="home-advertising-title"');
    expect(slots).toContain('id="adsterra-300x250"');
    expect(slots).toContain('id="container-06e9cf3d5469a7e1c33e98da08c56876"');
    expect(slots).toContain('2143d97a1a273993069cffe00f798381');
    expect(slots).toContain('06e9cf3d5469a7e1c33e98da08c56876');
    expect(slots).toContain('https://bauval.org/22/');
    expect(slots).toContain('https://bauval.org/21/');
    expect(styles).toContain('.home-advertising-grid');
  });
});
