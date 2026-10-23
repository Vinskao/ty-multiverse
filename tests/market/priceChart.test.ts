import { beforeEach, expect, it, vi } from 'vitest';
import { renderPriceChart } from '../../src/scripts/market/priceChart';
const points = ['2026-10-21', '2026-10-22'].map((date, i) => ({ date, sources: {
  price: { open: 100, high: 110, low: 90, close: 101 + i, volume: 1000 },
  'twse:valuation': { pe_ratio: 10 + i },
} }));
beforeEach(() => { document.body.innerHTML = '<div id="price-test"></div>'; });
it('defaults to PE on a separate labeled right axis and shows exact OHLC and PE on keyboard focus', () => {
  renderPriceChart('price-test', points, ['price'], 'volume', { zh: true, currency: 'TWD' });
  expect(document.querySelector('select')!.value).toBe('pe');
  expect(document.querySelector('[data-price-metric="pe"]')).not.toBeNull();
  expect(document.body.textContent).toContain('本益比');
  const svg = document.querySelector('svg')!;
  svg.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
  expect(document.querySelector('.market-chart-readout')!.textContent).toContain('2026-10-21');
  expect(document.querySelector('.market-chart-readout')!.textContent).toContain('10.00');
});
it('switches the right axis to inventory days, persists the choice, and restores it on redraw', () => {
  const saved = vi.spyOn(window.localStorage, 'setItem');
  renderPriceChart('price-test', points, ['price'], 'volume', { zh: true, currency: 'TWD', comparisons: {
    inventoryDays: [{ date: '2026-08-14', period: '2026Q2', value: 80, estimated: false }], operatingMargin: [],
  } });
  const select = document.querySelector('select')!;
  select.value = 'inventoryDays'; select.dispatchEvent(new Event('change'));
  expect(saved).toHaveBeenCalledWith('market-price-comparison:v1', 'inventoryDays');
  expect(document.querySelector('[data-price-metric="inventoryDays"]')).not.toBeNull();
  expect(document.querySelector('.market-chart-readout')!.textContent).toContain('80.00');
});
it('keeps controls for missing data and does not draw a fabricated PE line', () => {
  renderPriceChart('price-test', points.map(p => ({ ...p, sources: { price: p.sources.price } })), ['price'], 'volume', { zh: true, currency: 'JPY' });
  expect(document.body.textContent).toContain('JPY');
  expect(document.body.textContent).toContain('沒有可用');
  expect(document.querySelector('[data-price-metric="pe"]')).toBeNull();
  expect(document.querySelectorAll('.market-chart-controls button')).toHaveLength(6);
});
