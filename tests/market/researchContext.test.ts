import { describe, it, expect } from 'vitest';
import { buildResearchContext, brokerAvailabilityLabel } from '../../src/scripts/market/researchContext';

describe('live agent research context', () => {
    it('distinguishes delayed, frozen and unclassified broker values', () => {
        expect(brokerAvailabilityLabel('DPB', 'zh')).toBe('延遲行情');
        expect(brokerAvailabilityLabel('ZB', 'zh')).toBe('凍結行情');
        expect(brokerAvailabilityLabel(undefined, 'zh')).toBe('行情狀態未知');
    });
    it('keeps the market identity and latest periods, rather than treating fetch time as release time', () => {
        const context = buildResearchContext({ code: '6857', market: 'JP' }, { stocks: { '6857': { wrongTaiwan: true } } },
            { indicators: [{ code: 'CPI', referencePeriod: '2026-09', value: '3.2', fetchedAt: '2026-10-16' }] }, {}, '2026-10-16');
        expect(context.analysisCode).toBe('6857-JP');
        expect(context.stock).toBeNull();
        expect(context.macro[0].period).toBe('2026-09');
        expect(context.macro[0].publishedAt).toBeNull();
    });
    it('includes newer fundamentals and upcoming events on each rebuild', () => {
        const make = (period: string) => buildResearchContext({ code: '3081', market: 'TW' },
            { stocks: { '3081': { fundamentals: { latestMonth: { period } } } } }, {},
            { events: [{ code: '3081', date: '2026-10-23', type: 'conference' }] }, '2026-10-16');
        expect(make('2026-10').stock.fundamentals.latestMonth.period).toBe('2026-10');
        expect(make('2026-09').events).toHaveLength(1);
    });
});
