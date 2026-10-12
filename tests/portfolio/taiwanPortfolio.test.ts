import { describe, it, expect } from 'vitest';
import { taiwanPortfolio } from '../../src/services/core/taiwanPortfolio';
import type { Portfolio } from '../../src/types/portfolio';

describe('Taiwan dashboard projection', () => {
    const merged = {
        cashBalance: 150, totalAssetsEstimated: 900, totalPnl: 90, leverageRatio: 1,
        positions: [{ pnl: 5 }], valuationNote: 'estimated; includes IBKR @ 32 USD/TWD',
        ibkr: { twd: { netLiquidation: 600 } },
        summaryFormulas: { cashBalance: '50 + 0 + IBKR 100', totalAssetsEstimated: '50 + 200 + 50 + IBKR 600' },
        regions: {
            taiwan: { cash: 50, totalAssets: 300, totalPnl: 5, leverage: 2 },
            overseas: { cash: 100, totalAssets: 600, totalPnl: 85, leverage: 0.5 },
            total: { cash: 150, totalAssets: 900, totalPnl: 90, leverage: 1 },
        },
    } as unknown as Portfolio;
    it('uses Taiwan values even when an old browser cache contains overseas assets', () => {
        const result = taiwanPortfolio(merged);
        expect([result.cashBalance, result.totalAssetsEstimated, result.totalPnl, result.leverageRatio]).toEqual([50, 300, 5, 2]);
        expect(result.ibkr).toBeUndefined();
        expect(result.regions?.overseas.totalAssets).toBe(0);
        expect(result.summaryFormulas?.totalAssetsEstimated).toBe('50 + 200 + 50');
        expect(result.valuationNote).toBe('estimated');
        expect(merged.totalAssetsEstimated).toBe(900);
        expect(merged.ibkr).toBeDefined();
    });
    it('preserves null and zero Taiwan figures instead of falling back to merged totals', () => {
        const result = taiwanPortfolio({ ...merged, regions: { ...merged.regions!, taiwan: { cash: 0, totalAssets: null, totalPnl: 0, leverage: null } } });
        expect(result.cashBalance).toBe(0);
        expect(result.totalAssetsEstimated).toBeNull();
        expect(result.totalPnl).toBe(0);
        expect(result.leverageRatio).toBeNull();
    });
    it('accepts older Taiwan-only responses without regions', () => {
        const legacy = { ...merged, regions: undefined, ibkr: undefined };
        expect(taiwanPortfolio(legacy)).toBe(legacy);
    });
});
