import { describe, expect, it } from 'vitest';
import { chartDate, rangeWindow, visibleRows, zoomWindow, readChartPreference, writeChartPreference } from '../../src/scripts/market/chartViewport';

describe('shared chart time window', () => {
  it('normalizes daily, monthly and quarterly dates without local timezone shifts', () => {
    expect(chartDate('2024Q1')).toBe('2024-03-31');
    expect(chartDate('2024-02')).toBe('2024-02-29');
    expect(chartDate('2024-02-29')).toBe('2024-02-29');
    expect(chartDate('bad')).toBeNull();
    expect(chartDate('2024-13')).toBeNull();
    expect(chartDate('2024-00')).toBeNull();
  });
  it('anchors presets on the latest observation and clamps leap years', () => {
    const dates = ['2019-01-01', '2024-02-29'];
    expect(rangeWindow(dates, 'year')).toEqual({ start: '2023-02-28', end: '2024-02-29' });
    expect(rangeWindow(dates, 'month')).toEqual({ start: '2024-01-29', end: '2024-02-29' });
    expect(rangeWindow(dates, 'day')).toEqual({ start: '2024-02-29', end: '2024-02-29' });
    expect(rangeWindow(dates, 'fiveYears')).toEqual({ start: '2019-02-28', end: '2024-02-29' });
    expect(rangeWindow([], 'year')).toBeNull();
  });
  it('filters and sorts sparse observations, without inventing daily data', () => {
    const rows = [{ date: '2024Q2' }, { date: '2024Q1' }];
    expect(visibleRows(rows, r => r.date, { start: '2024-04-01', end: '2024-06-30' })).toEqual([rows[0]]);
    expect(visibleRows(rows, r => r.date, { start: '2024-06-29', end: '2024-06-29' })).toEqual([]);
  });
  it('zooms around the pointer, stays inside available data, and can expand a one-day window', () => {
    const dates = ['2024-01-01', '2024-12-31'];
    const initial = rangeWindow(dates, 'all')!;
    const zoomed = zoomWindow(dates, initial, -100, .5)!;
    expect(zoomed.start > initial.start).toBe(true);
    expect(zoomed.end < initial.end).toBe(true);
    expect(zoomWindow(dates, initial, 100, 0)).toEqual(initial);
    expect(zoomWindow(dates, { start: '2024-12-31', end: '2024-12-31' }, 100, 1)!.start < '2024-12-31').toBe(true);
  });
  it('validates and safely persists preferences when storage is blocked or corrupt', () => {
    const values = new Map<string, string>();
    const storage = { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { values.set(k, v); } };
    expect(readChartPreference(storage, 'metric', ['pe', 'inventoryDays'], 'pe')).toBe('pe');
    writeChartPreference(storage, 'metric', 'inventoryDays');
    expect(readChartPreference(storage, 'metric', ['pe', 'inventoryDays'], 'pe')).toBe('inventoryDays');
    values.set('metric', 'script');
    expect(readChartPreference(storage, 'metric', ['pe'], 'pe')).toBe('pe');
    const blocked = { getItem: () => { throw Error(); }, setItem: () => { throw Error(); } };
    expect(readChartPreference(blocked, 'metric', ['pe'], 'pe')).toBe('pe');
    expect(() => writeChartPreference(blocked, 'metric', 'pe')).not.toThrow();
  });
});
