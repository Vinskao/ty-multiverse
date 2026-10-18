import { describe, it, expect } from 'vitest';
import {
    shiftMacroPeriod, macroHistoryLimit, macroSeriesPoints, resolveMacroCode, dedupeMacroEvents, macroAxisRange, MACRO_SERIES_TONES, macroValueAtOrBefore,
    macroPeriodLabel, MACRO_REBASE_PERIOD,
} from '../../src/scripts/market/macroSeries';

const monthly = (values: Array<[string, string]>) => values.map(([period, value]) => ({ period, value }));

describe('shiftMacroPeriod', () => {
    it('crosses year boundaries in both directions', () => {
        expect(shiftMacroPeriod('2026-01', -1)).toBe('2025-12');
        expect(shiftMacroPeriod('2026-09', -12)).toBe('2025-09');
        expect(shiftMacroPeriod('2025-12', 1)).toBe('2026-01');
    });
});

describe('macroHistoryLimit', () => {
    it('keeps about six months of daily sessions and four years of monthly periods', () => {
        expect(macroHistoryLimit(monthly([['2026-10-15', '4']]))).toBe(130);
        expect(macroHistoryLimit(monthly([['2026-09', '4']]))).toBe(48);
        expect(macroHistoryLimit(undefined)).toBe(48);
    });
});

describe('macroSeriesPoints', () => {
    const cpi = monthly([['2025-09', '324.0'], ['2026-08', '334.131'], ['2026-09', '336.298']]);

    it('computes month-over-month percent from the previous calendar month', () => {
        const points = macroSeriesPoints(cpi, 'mom');
        expect(points.map((point) => point.period)).toEqual(['2026-09']);
        expect(points[0].value).toBeCloseTo(0.6486, 3);
    });

    it('computes year-over-year percent and skips periods without a base year', () => {
        const points = macroSeriesPoints(cpi, 'yoy');
        expect(points).toHaveLength(1);
        expect(points[0].value).toBeCloseTo((336.298 / 324 - 1) * 100, 6);
    });

    it('turns thousand-person levels into a monthly change in persons', () => {
        const payrolls = monthly([['2026-08', '159015'], ['2026-09', '159044']]);
        expect(macroSeriesPoints(payrolls, 'jobs')).toEqual([{ period: '2026-09', value: 29_000 }]);
    });

    it('returns raw values for levels and drops non-numeric placeholders', () => {
        const rates = monthly([['2026-10-14', '3.75'], ['2026-10-15', '.'], ['2026-10-16', '4']]);
        expect(macroSeriesPoints(rates, 'percent')).toEqual([{ period: '2026-10-14', value: 3.75 }, { period: '2026-10-16', value: 4 }]);
    });

    it('never divides by a zero base (an unpublished month stored as 0)', () => {
        const employed = monthly([['2026-08', '0'], ['2026-09', '11655']]);
        expect(macroSeriesPoints(employed, 'mom')).toEqual([]);
    });

    it('limits daily history to the recent window before plotting', () => {
        const daily = Array.from({ length: 200 }, (_, index) => ({ period: `2026-${String(Math.floor(index / 28) + 1).padStart(2, '0')}-${String(index % 28 + 1).padStart(2, '0')}`, value: String(index) }));
        const points = macroSeriesPoints(daily, 'raw');
        expect(points).toHaveLength(130);
        expect(points[points.length - 1].value).toBe(199);
    });
});

describe('resolveMacroCode', () => {
    it('uses the first alternative that has data, else the first code', () => {
        const has = (code: string) => code === 'WORLD_GOLD_USD';
        expect(resolveMacroCode('COMEX_GOLD_USD|WORLD_GOLD_USD', has)).toBe('WORLD_GOLD_USD');
        expect(resolveMacroCode('COMEX_GOLD_USD|WORLD_GOLD_USD', () => true)).toBe('COMEX_GOLD_USD');
        expect(resolveMacroCode('DGS10', () => false)).toBe('DGS10');
    });
});

describe('dedupeMacroEvents', () => {
    const event = (overrides: Record<string, unknown>) => ({
        groupId: 'cpi', scheduledDate: '2026-11-10', scheduledAt: '2026-11-10T13:30:00Z', title: 'CPI', consensusValue: null, actualValue: null, ...overrides,
    });

    it('keeps one release per group and day, preferring the copy with figures', () => {
        const result = dedupeMacroEvents([event({ title: 'CPI / Consumer Price Index' }), event({ title: 'US CPI Report', consensusValue: '0.3%' })]);
        expect(result).toHaveLength(1);
        expect(result[0].consensusValue).toBe('0.3%');
    });

    it('keeps foreign releases on the same day apart from US releases', () => {
        const result = dedupeMacroEvents([event({ groupId: 'retail_sales', title: 'US Retail Sales' }), event({ groupId: 'retail_sales', title: 'UK Retail Sales' })]);
        expect(result).toHaveLength(2);
    });

    it('sorts by release time, treating date-only events as midday UTC', () => {
        const result = dedupeMacroEvents([
            event({ groupId: 'fed', scheduledDate: '2026-10-29', scheduledAt: null, title: 'FOMC' }),
            event({ groupId: 'employment', scheduledDate: '2026-10-29', scheduledAt: '2026-10-29T08:00:00Z', title: 'Claims' }),
        ]);
        expect(result.map((item) => item.groupId)).toEqual(['employment', 'fed']);
    });
});

describe('macroAxisRange', () => {
    it('pads the data range by 12% and rounds outward to one decimal', () => {
        expect(macroAxisRange([3.75, 4])).toEqual({ low: 3.7, high: 4.1 });
    });

    it('gives each separate axis a scale that fits its own series', () => {
        const twd = macroAxisRange([31.6, 32.3]);
        const jpy = macroAxisRange([142.1, 158.0]);
        const dxy = macroAxisRange([96.5, 101.8]);
        for (const [range, values] of [[twd, [31.6, 32.3]], [jpy, [142.1, 158.0]], [dxy, [96.5, 101.8]]] as const) {
            expect(range.low).toBeLessThan(Math.min(...values));
            expect(range.high).toBeGreaterThan(Math.max(...values));
            expect(range.high - range.low).toBeLessThan((Math.max(...values) - Math.min(...values)) * 1.5);
        }
    });

    it('keeps a visible band for a flat series', () => {
        const range = macroAxisRange([2, 2, 2]);
        expect(range.high).toBeGreaterThan(range.low);
    });
});

describe('MACRO_SERIES_TONES', () => {
    it('gives every series slot its own color so readout entries match their lines', () => {
        const colors = Object.values(MACRO_SERIES_TONES);
        expect(new Set(colors).size).toBe(colors.length);
    });
});

describe('macroValueAtOrBefore', () => {
    const twd = [{ period: '2026-10-14', value: 32.07 }, { period: '2026-10-15', value: 32.27 }];

    it('uses the exact date when the series traded that day', () => {
        expect(macroValueAtOrBefore(twd, '2026-10-15')).toEqual({ period: '2026-10-15', value: 32.27 });
    });

    it("carries the latest earlier value across another market's extra trading day", () => {
        expect(macroValueAtOrBefore(twd, '2026-10-16')).toEqual({ period: '2026-10-15', value: 32.27 });
    });

    it('does not carry a value more than a week forward or before the series starts', () => {
        expect(macroValueAtOrBefore(twd, '2026-10-30')).toBeUndefined();
        expect(macroValueAtOrBefore(twd, '2026-10-01')).toBeUndefined();
    });

    // Money stocks publish on different lags (U.S. M2 for 2026-08 while Japan already has 2026-09); exact matching
    // made the latest readout show Japan only, as if U.S. M2 were missing.
    it('carries a monthly value up to two months forward (the readout labels its own month)', () => {
        const m2 = [{ period: '2026-07', value: 1 }, { period: '2026-08', value: 2 }];
        expect(macroValueAtOrBefore(m2, '2026-09')).toEqual({ period: '2026-08', value: 2 });
        expect(macroValueAtOrBefore(m2, '2026-10')).toEqual({ period: '2026-08', value: 2 });
        expect(macroValueAtOrBefore(m2, '2026-11')).toBeUndefined();
        expect(macroValueAtOrBefore(m2, '2026-06')).toBeUndefined();
    });
});

describe('macroPeriodLabel', () => {
    it('shows quarterly series (FRED dates them by the first month) as calendar quarters', () => {
        expect(macroPeriodLabel('2026-04', 'quarterly')).toBe('2026 Q2');
        expect(macroPeriodLabel('2026-01', 'quarterly')).toBe('2026 Q1');
        expect(macroPeriodLabel('2025-10', 'quarterly')).toBe('2025 Q4');
    });

    it('leaves monthly, daily and unknown-frequency periods unchanged', () => {
        expect(macroPeriodLabel('2026-04', 'monthly')).toBe('2026-04');
        expect(macroPeriodLabel('2026-10-14', 'weekly')).toBe('2026-10-14');
        expect(macroPeriodLabel('2026-04', undefined)).toBe('2026-04');
    });
});

// Money and liquidity levels move slowly: the backend sends them since 2019 and the chart keeps all of it.
describe('long liquidity history', () => {
    it('keeps every observation of liquidity series and the usual window for others', () => {
        const daily = monthly([['2026-10-15', '4']]);
        expect(macroHistoryLimit(daily, 'RRPONTSYD')).toBe(Infinity);
        expect(macroHistoryLimit(monthly([['2026-09', '4']]), 'M2SL')).toBe(Infinity);
        expect(macroHistoryLimit(daily, 'SOFR')).toBe(130);
        const weeks = Array.from({ length: 400 }, (_, index) => ({ period: new Date(Date.UTC(2019, 0, 2 + index * 7)).toISOString().slice(0, 10), value: '7000' }));
        expect(macroSeriesPoints(weeks, 'raw', 'WALCL')).toHaveLength(400);
        expect(macroSeriesPoints(weeks, 'raw')).toHaveLength(130);
    });
});

describe('rebased money stocks', () => {
    it('indexes each stock to 100 in January 2020 and keeps the amount for the readout', () => {
        // Real U.S. M2 (USD billion): 15,410.3 in 2020-01 and 23,342.8 in 2026-08.
        const points = macroSeriesPoints(monthly([['2019-12', '15322.4'], ['2020-01', '15410.3'], ['2026-08', '23342.8']]), 'rebased', 'M2SL');
        expect(MACRO_REBASE_PERIOD).toBe('2020-01');
        expect(points.map((point) => point.period)).toEqual(['2019-12', '2020-01', '2026-08']);
        expect(points[1].value).toBe(100);
        expect(points[2].value).toBeCloseTo(23342.8 / 15410.3 * 100, 6);
        expect(points[2].raw).toBe(23342.8);
    });

    it('falls back to the first observation when January 2020 is missing', () => {
        const points = macroSeriesPoints(monthly([['2021-03', '50'], ['2021-04', '55']]), 'rebased', 'TW_M2');
        expect(points[0].value).toBe(100);
        expect(points[1].value).toBeCloseTo(110, 9);
    });
});

describe('macroAxisRange for non-negative levels', () => {
    it('does not pad below zero when every value is zero or more (Fed balance sheet vs. drained reverse repo)', () => {
        // Was -843.5 to 7873 for WALCL 7,029 and ON RRP 0.1.
        expect(macroAxisRange([0.1, 7029.4]).low).toBe(0);
        expect(macroAxisRange([-0.5, 1]).low).toBeLessThan(-0.5);
    });
});
