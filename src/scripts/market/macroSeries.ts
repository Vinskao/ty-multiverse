// Pure macro-series math shared by the dashboard charts; covered by tests/market/macroSeries.test.ts.

// 'rebased': a level indexed to 100 in MACRO_REBASE_PERIOD, so stocks in different currencies share one axis.
export type MacroSeriesFormat = 'jobs' | 'claims' | 'percent' | 'mom' | 'yoy' | 'sales' | 'raw' | 'rebased';
export type MacroHistoryRow = { period: string; value: string };
export type MacroPoint = { period: string; value: number; raw?: number };

// Money and liquidity levels move slowly; maya-sawa sends them since 2019 and charts keep all of it, so the 2020
// expansion, the 2022-23 contraction and the reverse repo draining to zero stay visible.
export const MACRO_LONG_HISTORY_CODES = new Set(['M2SL', 'EZ_M2_INDEX', 'JP_M2', 'TW_M2', 'TW_M1B', 'WALCL', 'US_NET_LIQUIDITY',
    'WTREGEN', 'RRPONTSYD', 'ECBASSETSW', 'JPNASSETS']);
export const MACRO_REBASE_PERIOD = '2020-01';

export const MACRO_FOREIGN_EVENT = /^(UK|EU|Euro(zone|pe)?|ECB|BoE|BoJ|Japan|China|Germany|Canada|Australia)\b/i;

export function shiftMacroPeriod(period: string, offset: number) {
    const [year, month] = period.split('-').map(Number);
    const point = new Date(Date.UTC(year, month - 1 + offset, 1));
    return `${point.getUTCFullYear()}-${String(point.getUTCMonth() + 1).padStart(2, '0')}`;
}

// FRED dates a quarterly observation by its first month (2026-04 = Q2); show the quarter instead.
export function macroPeriodLabel(period: string, frequency?: string) {
    if (frequency !== 'quarterly' || !/^\d{4}-\d{2}$/.test(period)) return period;
    return `${period.slice(0, 4)} Q${Math.floor((Number(period.slice(5)) - 1) / 3) + 1}`;
}

// Daily series (YYYY-MM-DD periods) keep about six months of sessions; monthly series keep four years.
export function macroHistoryLimit(history: MacroHistoryRow[] | undefined, code?: string) {
    if (code && MACRO_LONG_HISTORY_CODES.has(code)) return Infinity;
    return (history || []).some((item) => item.period.length === 10) ? 130 : 48;
}

// What a chart plots for a format: MoM/YoY percent, monthly job change (thousand-person levels × 1000), or the level.
// Periods without a base observation, or with a zero base (an unpublished month stored as 0), are dropped.
export function macroSeriesPoints(history: MacroHistoryRow[] | undefined, format: MacroSeriesFormat, code?: string): MacroPoint[] {
    const limit = macroHistoryLimit(history, code);
    const valid = (history || []).map((item) => ({ period: item.period, value: Number(item.value) }))
        .filter((item) => item.period && Number.isFinite(item.value));
    const raw = Number.isFinite(limit) ? valid.slice(-limit) : valid;
    if (format === 'rebased') {
        const base = (raw.find((item) => item.period === MACRO_REBASE_PERIOD) || raw[0])?.value;
        return base ? raw.map((item) => ({ period: item.period, value: item.value / base * 100, raw: item.value })) : [];
    }
    const offset = format === 'yoy' ? 12 : ['mom', 'sales', 'jobs'].includes(format) ? 1 : 0;
    if (!offset) return raw;
    const byPeriod = new Map(raw.map((item) => [item.period, item.value]));
    return raw.flatMap((item) => {
        const base = byPeriod.get(shiftMacroPeriod(item.period, -offset));
        if (base === undefined || base === 0) return [];
        const value = format === 'jobs' ? (item.value - base) * 1000 : (item.value / base - 1) * 100;
        return Number.isFinite(value) ? [{ period: item.period, value }] : [];
    });
}

// Chart specs may list alternatives as "a|b": the first code that has data wins, else the first code.
export function resolveMacroCode(choice: string, hasData: (code: string) => boolean) {
    const codes = choice.split('|');
    return codes.find(hasData) || codes[0];
}

type DedupableEvent = { groupId: string; scheduledDate: string; scheduledAt?: string | null; title: string; consensusValue?: string | null; actualValue?: string | null };

export function macroEventInstant(event: Pick<DedupableEvent, 'scheduledAt' | 'scheduledDate'>) {
    return event.scheduledAt ? new Date(event.scheduledAt) : new Date(`${event.scheduledDate}T12:00:00Z`);
}

// FinanceCalendar and FRED often list the same release; keep one per group and day,
// preferring the copy that carries consensus or actual figures. Foreign and "other" releases keep their own title.
export function dedupeMacroEvents<T extends DedupableEvent>(events: T[]): T[] {
    const hasFigures = (item: T) => item.consensusValue != null || item.actualValue != null;
    const byKey = new Map<string, T>();
    for (const event of events) {
        const key = `${event.groupId}|${event.scheduledDate}|${event.groupId === 'other' || MACRO_FOREIGN_EVENT.test(event.title) ? event.title : ''}`;
        const existing = byKey.get(key);
        if (!existing || (!hasFigures(existing) && hasFigures(event))) byKey.set(key, event);
    }
    return [...byKey.values()].sort((a, b) => macroEventInstant(a).getTime() - macroEventInstant(b).getTime());
}

// Y range for one axis: 12% padding on each side, rounded outward to one decimal (flat series still get a band).
// Non-negative data never pads below zero (a -843.5 tick under balances that cannot be negative).
export function macroAxisRange(values: number[]) {
    const min = Math.min(...values), max = Math.max(...values);
    const span = Math.max(max - min, 0.1);
    const low = Math.floor((min - span * 0.12) * 10) / 10;
    return { low: min >= 0 ? Math.max(low, 0) : low, high: Math.ceil((max + span * 0.12) * 10) / 10 };
}

// One color per series slot. The line, hover marker, axis labels and readout entry of a series all use it,
// so a value under a multi-line chart can be matched to its line. Keep every color distinct.
export const MACRO_SERIES_TONES = {
    base: '#70b7f0',
    'series-1': '#f2c45d',
    'series-2': '#72d3ad',
    'series-3': '#d98ff5',
    'series-4': '#f08e82',
    expected: '#ff9f43',
    consensus: '#b8c4d6',
} as const;
export type MacroSeriesTone = keyof typeof MACRO_SERIES_TONES;

// Value shown for a series at a hovered date. Daily series trade on different calendars (Taiwan vs. U.S. vs. FX),
// so carry the latest earlier close for up to 7 days; monthly periods must match exactly.
export function macroValueAtOrBefore(values: MacroPoint[], period: string): MacroPoint | undefined {
    const exact = values.find((item) => item.period === period);
    if (exact || period.length !== 10) return exact;
    const limit = new Date(`${period}T00:00:00Z`).getTime() - 7 * 86_400_000;
    let found: MacroPoint | undefined;
    for (const item of values) {
        if (item.period.length !== 10 || item.period > period) continue;
        if (new Date(`${item.period}T00:00:00Z`).getTime() < limit) continue;
        if (!found || item.period > found.period) found = item;
    }
    return found;
}
