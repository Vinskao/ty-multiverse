import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

// 2026-11-18: the two top macro charts (market P/E; margin loans, maintenance ratio, margin calls) sit side by side, and
// no chart may be left to grow with the page width: an unbounded SVG scales with its column and gets enormous.
const css = readFileSync('src/styles/market-macro.css', 'utf8');
const rule = (selector: string) => css.split('\n').filter((line) => line.startsWith(selector)).join(' ');

it('lays the two top charts out in two columns, not one', () => {
  const layout = rule('.macro-leverage');
  expect(layout).toMatch(/grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  expect(layout).not.toMatch(/grid-template-columns:\s*1fr\s*;/);
});

it('caps the width of the whole block and the size of each chart', () => {
  expect(rule('.macro-leverage')).toMatch(/max-width:\s*\d+(px|rem)/);
  expect(rule('.macro-leverage .macro-trend-chart svg')).toMatch(/max-height:\s*\d+px/);
});

it('falls back to one column on a phone', () => {
  expect(css).toMatch(/@media \(max-width: 760px\)[^\n]*\.macro-borrowing\s*\{\s*grid-template-columns:1fr/);
});

it('puts cloud spending and index bias in adjacent grid cells', () => {
  const script = readFileSync('src/scripts/index.ts', 'utf8');
  expect(script).not.toContain('macro-wide-card');
  const layout = readFileSync('src/scripts/market/macroLayout.ts', 'utf8');
  expect(layout).toContain('[MACRO_CSP_CHART, MACRO_BIAS_CHART,');
});

it('pairs Taiwan and US bias series by the selected moving-average window', async () => {
  const { MACRO_BIAS_WINDOWS } = await import('../../src/scripts/market/macroLayout');
  expect(MACRO_BIAS_WINDOWS.map(window => window.codes)).toEqual([20, 60, 120, 240]
    .map(days => [`TW_TAIEX_BIAS_${days}`, `US_SP500_BIAS_${days}`]));
});
