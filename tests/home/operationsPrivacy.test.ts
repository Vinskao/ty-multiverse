import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

it('keeps returning-reader statistics and AI usage off the public home page', () => {
  const home = readFileSync('src/pages/index.astro', 'utf8');
  const script = readFileSync('src/scripts/index.ts', 'utf8');
  expect(home).not.toContain('north-star-readout');
  expect(home).not.toContain('<AiTokenUsageDashboard');
  expect(script).not.toContain('loadNorthStar');
});
