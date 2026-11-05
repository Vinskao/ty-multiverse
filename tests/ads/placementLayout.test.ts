import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

it('uses a shared compact disclosure without provider and size headings', () => {
  const component = readFileSync('src/components/HomeAdPlacements.astro', 'utf8');
  expect(component).toContain('homeAdvertising.css?url');
  expect(component).not.toMatch(/<h3>Adsterra/);
  expect(component).toContain('廣告');
});

it('gives the sticky learning sidebar an opaque theme background', () => {
  const css = readFileSync('src/styles/learn.css', 'utf8');
  expect(css).toMatch(/\.learn-sidebar\s*\{[^}]*background:\s*var\(--gray-999\)/);
});
