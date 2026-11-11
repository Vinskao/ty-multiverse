import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';

const css = readFileSync(resolve(process.cwd(), 'src/styles/qabot-flat.css'), 'utf8');
const group = ':is(.fullscreen-button, .history-button, .page-analysis-button, .close-button)';

// 2026-11-11: the four chat header buttons mixed sizes, radii and backgrounds (the page-analysis one was a leftover green circle).
it('gives all four chat header buttons one size, one radius and a centred icon', () => {
  const rule = css.match(new RegExp(`\.header-controls ${group.replace(/[().,]/g, '\$&')} \{([^}]*)\}`))![1];
  expect(rule).toMatch(/width:\s*var\(--qa-ctl-size\)/);
  expect(rule).toMatch(/height:\s*var\(--qa-ctl-size\)/);
  expect(rule).toMatch(/place-items:\s*center/);
  expect(rule).toMatch(/border-radius:\s*10px/);
  expect(rule).toMatch(/padding:\s*0/);
});

it('draws the header icons at one size and keeps a visible keyboard focus ring', () => {
  expect(css).toMatch(/\.header-controls [^{]*svg \{[^}]*width:\s*18px[^}]*height:\s*18px/);
  expect(css).toMatch(/:focus-visible \{[^}]*outline:\s*2px solid var\(--accent-regular\)/);
});

it('keeps the account control readable at one height with the other nav controls', () => {
  const nav = readFileSync(resolve(process.cwd(), 'src/styles/nav.css'), 'utf8');
  expect(nav).toMatch(/\.nav-auth \.nav-auth-trigger\.link \{[^}]*height:\s*var\(--nav-control-size\)[^}]*font-weight:\s*600/);
});
