import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';

it('bounds the sticky picker to the instrument row, above the other-info zone (usage, chip summary)', () => {
  document.body.innerHTML = readFileSync(resolve(process.cwd(), 'src/pages/index.astro'), 'utf8');
  const row = document.querySelector('.market-instrument-layout');
  expect(row?.querySelector('#market-watchlist')).not.toBeNull();
  expect(row?.querySelector('#market-chart-section')).not.toBeNull();
  expect(row?.querySelector('#market-usage-section')).toBeNull();
  const other = document.querySelector('.home-other-info');
  expect(other?.querySelector('#market-usage-section')).not.toBeNull();
  expect(other?.querySelector('.market-brief-disclosure')).not.toBeNull();
  // 其他資訊 is its own zone right after the research reports
  expect(row!.compareDocumentPosition(other!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(document.getElementById('zone-reports')!.compareDocumentPosition(other!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(document.getElementById('zone-other')?.contains(other!)).toBe(true);
});
