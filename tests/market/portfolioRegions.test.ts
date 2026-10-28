import { describe, it, expect } from 'vitest';
import { regionSplit } from '../../src/scripts/market/portfolioRegions';

const fmt = (value: number | null) => value === null ? '—' : String(value);
const taiwan = { cash: 100, totalAssets: 500, totalPnl: 2, leverage: 1.2 };
const none = { cash: 0, totalAssets: 0, totalPnl: 0, leverage: null };

describe('regionSplit', () => {
    it('is hidden when everything is in Taiwan', () => {
        expect(regionSplit({ taiwan, overseas: none, total: taiwan }, 'totalAssets', 'zh', fmt)).toBeNull();
        expect(regionSplit(undefined, 'totalAssets', 'zh', fmt)).toBeNull();
    });

    it('shows Taiwan and overseas as before', () => {
        const overseas = { cash: 30, totalAssets: 300, totalPnl: 1, leverage: 1 };
        expect(regionSplit({ taiwan, overseas, total: taiwan }, 'totalAssets', 'zh', fmt)).toBe('台 500 · 外 300');
        expect(regionSplit({ taiwan, overseas, total: taiwan }, 'cash', 'en', fmt)).toBe('TW 100 · Overseas 30');
    });

    it('adds crypto to total assets but not to cash, which stablecoins are not', () => {
        const crypto = { cash: null, totalAssets: 54400, totalPnl: null, leverage: null };
        expect(regionSplit({ taiwan, overseas: none, total: taiwan, crypto }, 'totalAssets', 'zh', fmt)).toBe('台 500 · 幣 54400');
        expect(regionSplit({ taiwan, overseas: none, total: taiwan, crypto }, 'cash', 'zh', fmt)).toBeNull();
        const overseas = { cash: 30, totalAssets: 300, totalPnl: 1, leverage: 1 };
        expect(regionSplit({ taiwan, overseas, total: taiwan, crypto }, 'totalAssets', 'en', fmt)).toBe('TW 500 · Overseas 300 · Crypto 54400');
    });
});
