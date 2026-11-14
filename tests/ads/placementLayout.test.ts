import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

it('gives the sticky learning sidebar an opaque theme background', () => {
  const css = readFileSync('src/styles/learn.css', 'utf8');
  expect(css).toMatch(/\.learn-sidebar\s*\{[^}]*background:\s*var\(--gray-999\)/);
});
