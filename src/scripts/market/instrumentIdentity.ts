// Which market an instrument belongs to; covered by tests/market/instrumentIdentity.test.ts.
// A code alone is ambiguous: Tokyo's 6857 (Advantest) and Taiwan's 6857 (宏碁智醫) share the same digits.
// The API sends `market` (TW, US, JP, KR, …); rows without it predate overseas holdings and are Taiwan.

type Identified = { code: string; market?: string | null };

const MARKET_LABELS: Record<string, { en: string; zh: string }> = {
    US: { en: 'U.S.', zh: '美國' }, JP: { en: 'Japan', zh: '日本' }, KR: { en: 'Korea', zh: '韓國' },
    HK: { en: 'Hong Kong', zh: '香港' }, EU: { en: 'Europe', zh: '歐洲' }, GB: { en: 'UK', zh: '英國' },
};

export function instrumentMarket(item: Identified): string {
    return String(item.market || 'TW').toUpperCase();
}

export function isTaiwanInstrument(item: Identified): boolean {
    return instrumentMarket(item) === 'TW';
}

// AI analysis record: Taiwan keeps the bare code (existing records); overseas gets "CODE-MARKET".
export function analysisRecordCode(item: Identified): string {
    const code = item.code.toUpperCase();
    return isTaiwanInstrument(item) ? code : `${code}-${instrumentMarket(item)}`;
}

export function instrumentMarketLabel(item: Identified, language: 'en' | 'zh'): string {
    if (isTaiwanInstrument(item)) return '';
    const market = instrumentMarket(item);
    return MARKET_LABELS[market]?.[language] ?? market;
}
