import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';

it('bounds the sticky picker to the instrument row, above usage and portfolio', () => {
  document.body.innerHTML = readFileSync(resolve(process.cwd(), 'src/pages/index.astro'), 'utf8');
  const row = document.querySelector('.market-instrument-layout');
  expect(row?.querySelector('#market-watchlist')).not.toBeNull();
  expect(row?.querySelector('#market-chart-section')).not.toBeNull();
  expect(row?.querySelector('#market-usage-section')).toBeNull();
  expect(row?.nextElementSibling?.id).toBe('market-usage-section');
});
