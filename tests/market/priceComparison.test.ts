import { expect, it } from 'vitest';
import { priceCandles, comparisonAt, statementComparisons, overseasPePoints, PRICE_METRICS } from '../../src/scripts/market/priceComparison';

it('pins existing daily OHLC and volume behavior and rejects invalid prices', () => {
  const points = [{ date: '2026-10-22', sources: { 'twse:daily-price': { open: 38.8, high: 39, low: 38.5, close: 38.55, volume_shares: 321 } } }];
  expect(priceCandles(points, ['twse:daily-price'], 'volume_shares')).toEqual([{ date: '2026-10-22', open: 38.8, high: 39, low: 38.5, close: 38.55, volume: 321, pe: null }]);
  expect(priceCandles([{ date: 'x', sources: { bad: { open: NaN, high: 1, low: 1, close: 1 } } }], ['bad'], 'volume')).toEqual([]);
});
it('calculates overseas trailing PE only from four consecutive quarters already filed in the price currency', () => {
  const rows = ['2025-03-31', '2025-06-30', '2025-09-30', '2025-12-31'].map(end => ({ end, currency: 'USD', epsDiluted: 2, evidence: { epsDiluted: { filed: '2026-02-01' } } }));
  expect(overseasPePoints([{ date: '2026-01-30', close: 80 }, { date: '2026-02-02', close: 88 }], { quarterly: rows }, 'USD')).toEqual([{ date: '2026-02-02', value: 11, period: '2025-12-31', estimated: false }]);
  expect(overseasPePoints([{ date: '2026-02-02', close: 88 }], { quarterly: rows.slice(1) }, 'USD')).toEqual([]);
  expect(overseasPePoints([{ date: '2026-02-02', close: 88 }], { quarterly: rows }, 'JPY')).toEqual([]);
});
it('uses only same-day official PE, never fills missing PE from a later or previous trading day', () => {
  const point = (date: string, pe?: number) => ({ date, sources: { price: { open: 1, high: 1, low: 1, close: 1 }, 'twse:valuation': pe === undefined ? {} : { pe_ratio: pe } } });
  expect(priceCandles([point('2026-10-21', 10.65), point('2026-10-22')], ['price'], 'volume').map(p => p.pe)).toEqual([10.65, null]);
});
it('aligns statements on explicit publication dates and keeps period labels in the readout', () => {
  const series = statementComparisons({ quarterly: [{ period: '2026Q2', publishedAt: '2026-08-14', operatingMargin: 12.3 }], balance: [{ period: '2026Q2', inventoryDays: 80 }] });
  expect(comparisonAt(series.operatingMargin, '2026-08-13')).toBeNull();
  expect(comparisonAt(series.operatingMargin, '2026-08-14')).toMatchObject({ value: 12.3, period: '2026Q2' });
  expect(comparisonAt(series.inventoryDays, '2026-08-13')).toBeNull();
  expect(comparisonAt(series.inventoryDays, '2026-08-14')).toMatchObject({ value: 80, estimated: true });
});
it('preserves zero margins, rejects placeholders and invalid inventory, and sorts releases', () => {
  const series = statementComparisons({ quarterly: [{ period: '2026Q2', operatingMargin: 0 }, { period: '2026Q1', operatingMargin: null }], balance: [{ period: '2026Q2', inventoryDays: -1 }] });
  expect(series.operatingMargin[0].value).toBe(0);
  expect(series.inventoryDays).toEqual([]);
  expect(PRICE_METRICS).toEqual(['pe', 'inventoryDays', 'operatingMargin', 'none']);
});
