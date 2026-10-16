import { describe, it, expect } from 'vitest';
import { analysisRating } from '../../src/scripts/market/analysisRating';

describe('analysisRating', () => {
    it('reads the rating that opens the conclusion line', () => {
        expect(analysisRating('標題\n【結論】買（拉回守 20 日線分批；跌破 60 日線停損）。')).toBe('buy');
        expect(analysisRating('【結論】賣（降低曝險）。記憶體景氣高峰疑慮')).toBe('sell');
        expect(analysisRating('【結論】中立（降低多單曝險、不追空）。')).toBe('neutral');
    });

    it('ignores other ratings mentioned later in the conclusion (conditions to switch)', () => {
        expect(analysisRating('【結論】中立（基本面偏多、短線偏空；若今日收盤確認跌破 2,585 即轉賣）。')).toBe('neutral');
        expect(analysisRating('【結論】中立（偏多；技術位階止穩即升買）。')).toBe('neutral');
    });

    it('accepts other conclusion layouts and English ratings', () => {
        expect(analysisRating('• 結論：買／中立／賣 → 賣')).toBe('sell');
        expect(analysisRating('結論: 買')).toBe('buy');
        expect(analysisRating('Conclusion: Neutral, wait for the 10/23 call')).toBe('neutral');
        expect(analysisRating('Rating — Sell')).toBe('sell');
    });

    it('does not guess when there is no conclusion', () => {
        expect(analysisRating('近期營收成長，買盤積極。')).toBeNull();
        expect(analysisRating('')).toBeNull();
        expect(analysisRating(undefined)).toBeNull();
    });
});
