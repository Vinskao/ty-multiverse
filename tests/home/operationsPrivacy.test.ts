import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

it('shows public AI usage without exposing returning-reader statistics', () => {
  const home = readFileSync('src/pages/index.astro', 'utf8');
  const script = readFileSync('src/scripts/index.ts', 'utf8');
  expect(home).not.toContain('north-star-readout');
  expect(home).toContain('<AiTokenUsageDashboard client:visible />');
  expect(script).not.toContain('loadNorthStar');
});
