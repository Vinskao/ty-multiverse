import { describe, it, expect } from 'vitest';
import { TDCC_BUCKETS, tdccTierLowerBound, tdccBuckets, tdccChangeSeries } from '../../src/scripts/market/tdcc';

const tiers = [
    { tier: '1-999', percent: '3.10', shares: '100', holders: '2000000' },
    { tier: '1,000-5,000', percent: '2.73', shares: '50', holders: '900000' },
    { tier: '10,001-15,000', percent: '4.02', shares: '40', holders: '40000' },
    { tier: '100,001-200,000', percent: '5.29', shares: '30', holders: '4500' },
    { tier: '1,000,001以上', percent: '84.86', shares: '900', holders: '1500' },
    { tier: '差異數調整', percent: '0', shares: '0', holders: '0' },
    { tier: '合計', percent: '100', shares: '1120', holders: '2946000' },
];

describe('tdccTierLowerBound', () => {
    it('reads the numeric lower bound and ignores label-only rows', () => {
        expect(tdccTierLowerBound('1,000,001以上')).toBe(1_000_001);
        expect(tdccTierLowerBound(' 10,001-15,000')).toBe(10_001);
        expect(tdccTierLowerBound('合計')).toBeNull();
        expect(tdccTierLowerBound(undefined)).toBeNull();
    });
});

describe('tdccBuckets', () => {
    it('folds every tier into four buckets that sum to 100% and skips the total rows', () => {
        const buckets = tdccBuckets(tiers);
        expect(buckets.map((bucket) => bucket.percent)).toEqual([5.83, 4.02, 5.29, 84.86]);
        expect(buckets.reduce((sum, bucket) => sum + bucket.percent, 0)).toBeCloseTo(100, 6);
        expect(buckets[0]).toMatchObject({ shares: 150, holders: 2_900_000, tiers: 2 });
        expect(buckets).toHaveLength(TDCC_BUCKETS.length);
    });
});

describe('tdccChangeSeries', () => {
    it('plots each bucket as the change in percentage points since the first week', () => {
        const first = tdccBuckets(tiers);
        const later = tdccBuckets(tiers.map((row) => row.tier === '1-999' ? { ...row, percent: '3.19' } : row.tier.startsWith('1,000,001') ? { ...row, percent: '84.77' } : row));
        expect(tdccChangeSeries([first, later])).toEqual([[0, 0, 0, 0], [0.09, 0, 0, -0.09]]);
    });
});
