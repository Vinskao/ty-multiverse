import { expect, it } from 'vitest';
import jp6857 from '../fixtures/overseas-pe-6857-jp.json';
import usMeta from '../fixtures/overseas-pe-meta-us.json';
import { priceCandles, comparisonAt, statementComparisons, overseasPePoints, PRICE_METRICS } from '../../src/scripts/market/priceComparison';

it('pins existing daily OHLC and volume behavior and rejects invalid prices', () => {
  const points = [{ date: '2026-10-22', sources: { 'twse:daily-price': { open: 38.8, high: 39, low: 38.5, close: 38.55, volume_shares: 321 } } }];
  expect(priceCandles(points, ['twse:daily-price'], 'volume_shares')).toEqual([{ date: '2026-10-22', open: 38.8, high: 39, low: 38.5, close: 38.55, volume: 321, pe: null, peEstimated: false }]);
  expect(priceCandles([{ date: 'x', sources: { bad: { open: NaN, high: 1, low: 1, close: 1 } } }], ['bad'], 'volume')).toEqual([]);
});
it('calculates overseas trailing PE only from four consecutive quarters already filed in the price currency', () => {
  const rows = ['2025-03-31', '2025-06-30', '2025-09-30', '2025-12-31'].map(end => ({ end, currency: 'USD', epsDiluted: 2, evidence: { epsDiluted: { filed: '2026-02-01' } } }));
  expect(overseasPePoints([{ date: '2026-01-30', close: 80 }, { date: '2026-02-02', close: 88 }], { quarterly: rows }, 'USD')).toEqual([{ date: '2026-02-02', value: 11, period: '2025-12-31', estimated: false }]);
  expect(overseasPePoints([{ date: '2026-02-02', close: 88 }], { quarterly: rows.slice(1) }, 'USD')).toEqual([]);
  expect(overseasPePoints([{ date: '2026-02-02', close: 88 }], { quarterly: rows }, 'JPY')).toEqual([]);
});
const peOn = (points: ReturnType<typeof overseasPePoints>, date: string) => points.find(point => point.date === date);
it('gives Japan stocks a PE although year-to-date filings leave quarters after Q1 without EPS (6857)', () => {
  const { daily, financials } = jp6857 as any;
  const points = overseasPePoints(daily, financials, 'JPY');
  expect(points.length).toBe(daily.length);
  // 2026-10-22: four quarters of net income to 2026-06-30, scaled by Q1 FY2026 EPS 239.89 / NI 174.78bn.
  const ttm = (79633 + 78713 + 126827 + 174780) * 239.89 / 174780;
  expect(peOn(points, '2026-10-22')).toMatchObject({ period: '2026-06-30', estimated: false });
  expect(peOn(points, '2026-10-22')!.value).toBeCloseTo(32340 / ttm, 6);
  // Between the FY release (2026-04-27) and Q1 (2026-07-29) the reported annual EPS is used as is.
  const may = daily.find((bar: any) => bar.date >= '2026-05-01');
  expect(peOn(points, may.date)).toMatchObject({ period: '2026-03-31', value: may.close / 513.3 });
  // Nothing filed on 2026-07-29 is visible the day before.
  const before = daily.filter((bar: any) => bar.date < '2026-07-29').at(-1);
  expect(peOn(points, before.date)!.period).toBe('2026-03-31');
});
it('gives US stocks a PE across a fiscal Q4 that exists only in the 10-K, dating restated comparatives as estimated (META)', () => {
  const { daily, financials } = usMeta as any;
  const points = overseasPePoints(daily, financials, 'USD');
  expect(points.length).toBe(daily.length);
  // Every 2026 quarter has EPS but Q4 2025 (= FY2025 鈭?nine months) does not, so net income is scaled by Q3 2026 EPS.
  const q = Object.fromEntries(financials.quarterly.map((row: any) => [row.end, row.netIncome]));
  const q4 = 60458000000 - 37690000000;
  const ttm = (q4 + q['2026-03-31'] + q['2026-06-30'] + q['2026-09-30']) * 3.83 / q['2026-09-30'];
  expect(peOn(points, '2026-10-22')).toMatchObject({ period: '2026-09-30', estimated: false });
  expect(peOn(points, '2026-10-22')!.value).toBeCloseTo(648.85 / ttm, 6);
  // At the fiscal year end the 10-K's annual EPS is exact.
  expect(peOn(points, '2026-02-02')).toMatchObject({ period: '2025-12-31', value: daily.find((bar: any) => bar.date === '2026-02-02').close / 23.49 });
  // Before 2026-01-29 only comparatives re-filed a year later exist; they align 120 days after period end, marked estimated.
  expect(peOn(points, '2025-10-17')).toMatchObject({ period: '2025-03-31', estimated: true });
});
it('leaves loss-making trailing years, other currencies and undated rows without a PE', () => {
  const quarters = (eps: number[]) => ['2025-03-31', '2025-06-30', '2025-09-30', '2025-12-31'].map((end, i) => ({ end, currency: 'USD', netIncome: eps[i] * 10, epsDiluted: eps[i], evidence: { epsDiluted: { filed: '2026-02-01' } } }));
  const bar = [{ date: '2026-02-02', close: 88 }];
  expect(overseasPePoints(bar, { quarterly: quarters([-1, -1, 0.5, 0.5]) }, 'USD')).toEqual([]);
  expect(overseasPePoints(bar, { quarterly: quarters([2, 2, 2, 2]) }, 'KRW')).toEqual([]);
  expect(overseasPePoints(bar, { quarterly: quarters([2, 2, 2, 2]).map(({ evidence, ...row }) => row) }, 'USD')).toEqual([]);
  expect(overseasPePoints([{ date: '2026-02-02', close: null }], { quarterly: quarters([2, 2, 2, 2]) }, 'USD')).toEqual([]);
});
it('carries an estimated overseas PE date through to the candle', () => {
  const point = { date: '2026-01-02', sources: { price: { open: 1, high: 1, low: 1, close: 1 }, 'financials:trailing-pe': { pe_ratio: 20, estimated: true } } };
  expect(priceCandles([point], ['price'], 'volume')[0]).toMatchObject({ pe: 20, peEstimated: true });
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
