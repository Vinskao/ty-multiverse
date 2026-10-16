import { describe, it, expect } from 'vitest';
import { isTaiwanInstrument, analysisRecordCode, instrumentMarketLabel } from '../../src/scripts/market/instrumentIdentity';

describe('instrument identity', () => {
    it('treats rows without a market as Taiwan (stored before overseas holdings existed)', () => {
        expect(isTaiwanInstrument({ code: '2330' })).toBe(true);
        expect(isTaiwanInstrument({ code: '2330', market: 'TW' })).toBe(true);
        expect(isTaiwanInstrument({ code: '6857', market: 'JP' })).toBe(false);
    });

    it('keeps Taiwan analysis records on the bare code and gives overseas ones their own record', () => {
        expect(analysisRecordCode({ code: '2330' })).toBe('2330');
        expect(analysisRecordCode({ code: '6857', market: 'JP' })).toBe('6857-JP');
        expect(analysisRecordCode({ code: 'lite', market: 'us' })).toBe('LITE-US');
        expect(analysisRecordCode({ code: '000660', market: 'KR' })).toBe('000660-KR');
    });

    it('labels overseas markets for display', () => {
        expect(instrumentMarketLabel({ code: '6857', market: 'JP' }, 'zh')).toBe('日本');
        expect(instrumentMarketLabel({ code: 'LITE', market: 'US' }, 'en')).toBe('U.S.');
        expect(instrumentMarketLabel({ code: '2330' }, 'zh')).toBe('');
    });
});
