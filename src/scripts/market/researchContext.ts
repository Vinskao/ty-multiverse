import { analysisRecordCode, isTaiwanInstrument } from './instrumentIdentity';

// Fetch time is kept distinct from reference/trading/publication dates.
// Rebuild from current API results on every analysis opening, never from an old prompt.
export function buildResearchContext(instrument: { code: string; market?: string | null; underlyingCode?: string },
    brief: any, macro: any, events: any, checkedAt: string, overseas: any = null) {
    const code = isTaiwanInstrument(instrument) ? instrument.underlyingCode || instrument.code : analysisRecordCode(instrument);
    return {
        checkedAt, analysisCode: code, market: instrument.market || 'TW',
        stock: isTaiwanInstrument(instrument) ? brief?.stocks?.[code] ?? null : null,
        overseas: isTaiwanInstrument(instrument) ? null : overseas,
        macro: (macro?.indicators || []).map((item: any) => ({ code: item.code, period: item.referencePeriod,
            value: item.value, previousPeriod: item.previousPeriod, previousValue: item.previousValue,
            unit: item.unit, fetchedAt: item.fetchedAt, publishedAt: item.sourcePublishedAt ?? null })),
        events: events?.events || [],
        instruction: 'Compare these reference periods, trading dates, published dates and revised values with the saved analysis cutoff. Fetch time is not publication time. Recheck company primary sources; explicitly state missing data.'
    };
}
