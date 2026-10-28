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

const target = (firm: string, date: string, value: number) => ({ firm, date, action: null, rating: null, previousRating: null, target: value,
  previousTarget: null, currency: 'TWD', source: 'ai-routine', sourceUrl: 'https://example.com' });
const targets = [target('高盛', '2026-10-21', 150), target('美銀', '2026-10-22', 130), target('高盛', '2026-10-22', 160)];

it('draws one dashed line per broker on the price axis, with their latest values in the legend and readout', () => {
  window.localStorage.removeItem('market-price-targets-visible:v1');
  renderPriceChart('price-test', points, ['price'], 'volume', { zh: true, currency: 'TWD', targets });
  expect([...document.querySelectorAll('[data-broker-target]')].map(path => path.getAttribute('data-broker-target')).sort()).toEqual(['美銀', '高盛']);
  const labels = [...document.querySelectorAll('.market-history-axis-label')].map(node => Number(node.textContent!.replace(/,/g, ''))).filter(Number.isFinite);
  expect(Math.max(...labels)).toBeGreaterThanOrEqual(150);           // the price axis stretches to the highest target
  expect(document.querySelector('.market-target-legend')!.textContent).toContain('高盛 160.00');
  expect(document.querySelector('.market-chart-readout')!.textContent).toContain('券商目標價 高盛 160.00 · 美銀 130.00');
});

it('lets the viewer hide the broker lines, remembers the choice, and never draws them for futures', () => {
  const saved = vi.spyOn(window.localStorage, 'setItem');
  window.localStorage.removeItem('market-price-targets-visible:v1');
  renderPriceChart('price-test', points, ['price'], 'volume', { zh: true, currency: 'TWD', targets });
  const box = document.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
  box.checked = false; box.dispatchEvent(new Event('change'));
  expect(saved).toHaveBeenCalledWith('market-price-targets-visible:v1', '0');
  expect(document.querySelector('[data-broker-target]')).toBeNull();
  expect(document.querySelector('.market-target-legend')).toBeNull();
  const again = document.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
  again.checked = true; again.dispatchEvent(new Event('change'));
  expect(document.querySelectorAll('[data-broker-target]')).toHaveLength(2);
  renderPriceChart('price-test', points, ['price'], 'volume', { zh: true, currency: '點', futures: true, targets });
  expect(document.querySelector('[data-broker-target]')).toBeNull();
  expect(document.querySelector('input[type="checkbox"]')).toBeNull();
});

