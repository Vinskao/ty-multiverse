import { describe, expect, it } from 'vitest';
import { biasBreakAlert } from '../../src/scripts/market/macroBiasAlert';

const rows = (...values: [string, number][]) => values.map(([period, value]) => ({ period, value: String(value) }));

describe('biasBreakAlert', () => {
    const both = { TW_TAIEX_BIAS_120: rows(['2026-11-12', 1], ['2026-11-13', -1]), TW_TAIEX_BIAS_240: rows(['2026-11-12', 2], ['2026-11-13', -2]) };
    it('fires when two averages break on the same day and names them', () => {
        const alert = biasBreakAlert(both, '2026-11-18');
        expect(alert?.date).toBe('2026-11-13');
        expect(alert?.lines.map((line) => line.zh)).toEqual(['半年線', '年線']);
    });
    it('lasts one week from the break day, then clears', () => {
        expect(biasBreakAlert(both, '2026-11-19')).not.toBeNull();
        expect(biasBreakAlert(both, '2026-11-20')).toBeNull();
    });
    it('ignores a single break, breaks on different days, and lines already below', () => {
        expect(biasBreakAlert({ TW_TAIEX_BIAS_240: both.TW_TAIEX_BIAS_240 }, '2026-11-14')).toBeNull();
        expect(biasBreakAlert({ ...both, TW_TAIEX_BIAS_120: rows(['2026-11-12', 1], ['2026-11-13', 1], ['2026-11-14', -1]) }, '2026-11-14')).toBeNull();
        expect(biasBreakAlert({ TW_TAIEX_BIAS_120: rows(['2026-11-12', -1], ['2026-11-13', -1]), TW_TAIEX_BIAS_240: rows(['2026-11-12', -1], ['2026-11-13', -2]) }, '2026-11-13')).toBeNull();
    });
});
