import { beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { drawMarketHistoryChart, buildMacroTrendChart, renderPortfolioHistory } from '../../src/scripts/index';

beforeAll(() => { vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} }); });
beforeEach(() => { document.body.innerHTML = ''; });

it('filters and zooms the actual history renderer without losing original rows on redraw', () => {
  document.body.innerHTML = '<div id="integration-history"></div>';
  const points = ['2021-10-22', '2025-10-22', '2026-10-21', '2026-10-22'].map((date, i) => ({ date, code: '2330', name: 'TSMC', sources: { test: { value: i + 10 } } }));
  drawMarketHistoryChart('integration-history', points, [{ label: 'Value', color: '#fff', sourceKeys: ['test'], field: 'value' }]);
  const button = (text: string) => [...document.querySelectorAll('button')].find(b => b.textContent === text)!;
  button('1D').click();
  expect(document.querySelector('.market-chart-readout')!.textContent).toContain('2026-10-22');
  button('5Y').click();
  expect(document.querySelector('svg')!.textContent).toContain('2021-10-22');
  const svg = document.querySelector('svg')!;
  const event = new WheelEvent('wheel', { deltaY: -100, cancelable: true }); svg.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true);
  expect(document.querySelectorAll('.market-chart-controls')).toHaveLength(1);
  document.querySelector('svg')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', cancelable: true }));
  expect(document.querySelector('.market-chart-readout')!.textContent).toContain('2021-10-22');
});

it('retains macro observations beyond the old 130-session limit and redraws the chart with presets', () => {
  const history = Array.from({ length: 150 }, (_, i) => ({ period: new Date(Date.UTC(2026, 0, i + 1)).toISOString().slice(0, 10), value: String(i + 1) }));
  const chart = buildMacroTrendChart({ code: 'TEST_DAILY', unit: '%', frequency: 'daily', history } as any, 'raw', 'Test');
  document.body.append(chart);
  expect(chart.querySelectorAll('.market-chart-controls button')).toHaveLength(6);
  const all = [...chart.querySelectorAll('button')].find(b => b.textContent === 'All')!; all.click();
  expect(document.querySelector('svg')!.textContent).toContain('2026-01-01');
  const event = new WheelEvent('wheel', { deltaY: -100, cancelable: true }); document.querySelector('svg')!.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true);
});

it('keeps a single portfolio control bar and wheel listener across repeated redraws', () => {
  document.body.innerHTML = '<div><svg id="portfolio-history-svg"></svg></div><p id="portfolio-history-empty"></p><p id="portfolio-history-status"></p>';
  const points = ['2024-10-22', '2025-10-22', '2026-10-22'].map(date => ({ date, valuedAt: date, totalAssets: 100 }));
  renderPortfolioHistory(points); renderPortfolioHistory(points);
  expect(document.querySelectorAll('.market-chart-controls')).toHaveLength(1);
  document.querySelector('svg')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', cancelable: true }));
  expect(document.querySelector('.market-chart-readout')!.textContent).toContain('2026-10-22');
  const event = new WheelEvent('wheel', { deltaY: -100, cancelable: true }); document.querySelector('svg')!.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true);
  expect(document.querySelectorAll('.market-chart-controls')).toHaveLength(1);
  expect(document.querySelectorAll('.market-chart-readout')).toHaveLength(1);
});
