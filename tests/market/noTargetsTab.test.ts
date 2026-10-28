import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

const page = readFileSync('src/pages/index.astro', 'utf8');

it('has no separate target-price tab: the broker lines live on the price chart and the broker table sits under it', () => {
  expect(page).not.toContain('data-market-tab="targets"');
  expect(page).not.toContain('data-market-panel="targets"');
  const price = page.slice(page.indexOf('data-market-panel="price"'), page.indexOf('data-market-panel="institutional"'));
  expect(price).toContain('id="market-history-price-chart"');
  expect(price).toContain('id="market-targets-detail"');
});
