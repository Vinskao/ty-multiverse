import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const page = readFileSync(resolve(process.cwd(), 'src/pages/index.astro'), 'utf8');
const css = readFileSync(resolve(process.cwd(), 'src/styles/index.css'), 'utf8');
const globalCss = readFileSync(resolve(process.cwd(), 'src/styles/global.css'), 'utf8');

describe('homepage editorial layout', () => {
  it('keeps all three research workflow cards and the decision-by-user promise', () => {
    expect(page).toContain('home-product-steps');
    expect(page).toContain('home.productCollectBody');
    expect(page).toContain('home.productJudgeBody');
    expect(page).toContain('home.productDecideBody');
    expect(page).toContain('home.heroTagline');
  });

  it('uses an oversized high-contrast headline and a vivid accent on the landing page', () => {
    expect(css).toMatch(/\.home-product-title[^}]*font-size:\s*clamp\(/s);
    expect(css).toMatch(/\.home-page[^}]*--home-accent:/s);
    expect(css).toMatch(/\.home-product-steps article[^}]*grid-template-rows:/s);
  });

  it('shares the dark lime accent across pages through the global theme tokens', () => {
    expect(globalCss).toContain('--accent-regular: #c7ff00');
    expect(globalCss).toContain('--surface-radius: 0.9rem');
  });
});
