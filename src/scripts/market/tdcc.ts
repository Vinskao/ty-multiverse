// TDCC weekly distribution math; covered by tests/market/tdcc.test.ts.

// All 15 TDCC tiers are folded into four contiguous buckets that together cover 100% of shares outstanding
// (the "差異數調整" / "合計" rows have no numeric lower bound and are skipped). The 1,000+ lot bucket holds ~80%
// while retail sits at a few percent, so the shared chart plots changes rather than levels.
export const TDCC_BUCKETS = [
    { id: 'retail', min: 1, max: 10_000, key: 'marketHistoryBucketRetail', fallback: 'Retail · up to 10 lots', color: '#55b8a8' },
    { id: 'mid', min: 10_001, max: 100_000, key: 'marketHistoryBucketMid', fallback: 'Mid · 10–100 lots', color: '#7198df' },
    { id: 'large', min: 100_001, max: 1_000_000, key: 'marketHistoryBucketLarge', fallback: 'Large · 100–1,000 lots', color: '#dc806f' },
    { id: 'whale', min: 1_000_001, max: Infinity, key: 'marketHistoryBucketWhale', fallback: 'Over 1,000 lots', color: '#d5ae4b' },
];

export type TdccBucket = { percent: number; shares: number; holders: number; tiers: number };

export function tdccTierLowerBound(tier: unknown): number | null {
    const match = /^\s*([\d,]+)/.exec(String(tier ?? ''));
    return match ? Number(match[1].replace(/,/g, '')) : null;
}

export function tdccBuckets(tiers: any[]): TdccBucket[] {
    const totals = TDCC_BUCKETS.map(() => ({ percent: 0, shares: 0, holders: 0, tiers: 0 }));
    for (const row of tiers) {
        const bound = tdccTierLowerBound(row.tier); if (bound === null) continue;
        const index = TDCC_BUCKETS.findIndex((bucket) => bound >= bucket.min && bound <= bucket.max); if (index < 0) continue;
        totals[index].percent += Number(row.percent) || 0; totals[index].shares += Number(row.shares) || 0;
        totals[index].holders += Number(row.holders) || 0; totals[index].tiers += 1;
    }
    return totals.map((total) => ({ ...total, percent: Number(total.percent.toFixed(2)) }));
}

// Per snapshot, each bucket's change in percentage points since the first snapshot (2 decimals).
export function tdccChangeSeries(snapshots: TdccBucket[][]): number[][] {
    const first = snapshots[0] || [];
    return snapshots.map((buckets) => buckets.map((bucket, index) => Number((bucket.percent - (first[index]?.percent ?? 0)).toFixed(2)) + 0));
}
