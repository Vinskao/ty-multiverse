import { chartDate } from './chartViewport';
export const PRICE_METRICS = ['pe', 'inventoryDays', 'operatingMargin', 'none'] as const;
export type PriceMetric = typeof PRICE_METRICS[number];
export type PricePoint = { date: string; sources: Record<string, Record<string, any>> };
export type Candle = { date: string; open: number; high: number; low: number; close: number; volume: number | null; pe: number | null; peEstimated: boolean; peAdjusted: boolean };
const number = (value: unknown): number | null => typeof value === 'number' && Number.isFinite(value) ? value : null;
export function priceCandles(points: readonly PricePoint[], sources: string[], volumeField: string): Candle[] {
    return points.flatMap(point => {
        const values = sources.map(key => point.sources[key]).find(row => ['open', 'high', 'low', 'close'].every(key => number(row?.[key]) !== null));
        if (!values) return [];
        const official = number(point.sources['twse:valuation']?.pe_ratio) ?? number(point.sources['tpex:valuation']?.pe_ratio);
        const trailing = point.sources['financials:trailing-pe'];
        const pe = official ?? number(trailing?.pe_ratio);
        const fromTrailing = official === null && pe !== null;
        return [{ date: point.date, open: values.open, high: values.high, low: values.low, close: values.close,
            volume: number(values[volumeField]), pe: pe !== null && pe > 0 ? pe : null,
            peEstimated: fromTrailing && trailing?.estimated === true, peAdjusted: fromTrailing && trailing?.adjusted === true }];
    }).sort((a, b) => a.date.localeCompare(b.date));
}
export type ComparisonPoint = { date: string; period: string; value: number; estimated: boolean; adjusted?: boolean };
export type StatementComparisons = { inventoryDays: ComparisonPoint[]; operatingMargin: ComparisonPoint[] };
// Without a publication timestamp, use the Taiwan filing deadline, explicitly marked as estimated.
// Never align a quarter's financial result to the first day of that quarter.
function statementDate(row: Record<string, any>, market: string) {
    const published = typeof row.publishedAt === 'string' ? chartDate(row.publishedAt.slice(0, 10)) : null;
    if (published) return { date: published, estimated: false };
    const quarter = /^(\d{4})Q([1-4])$/.exec(String(row.period));
    if (!quarter) return null;
    const year = Number(quarter[1]);
    if (market !== 'TW') {
        const end = chartDate(String(row.period))!;
        return { date: new Date(Date.parse(`${end}T00:00:00Z`) + 120 * 86_400_000).toISOString().slice(0, 10), estimated: true };
    }
    return { date: [`${year}-05-15`, `${year}-08-14`, `${year}-11-14`, `${year + 1}-03-31`][Number(quarter[2]) - 1], estimated: true };
}
export function statementComparisons(metrics: Record<string, any[]> = {}, market = 'TW'): StatementComparisons {
    const series = (source: string, field: string) => (metrics[source] ?? []).flatMap(row => {
        const value = number(row[field]), release = statementDate(row, market);
        return value === null || !release || field === 'inventoryDays' && value < 0 ? [] : [{ ...release, period: String(row.period), value }];
    }).sort((a, b) => a.date.localeCompare(b.date));
    return { inventoryDays: series('balance', 'inventoryDays'), operatingMargin: series('quarterly', 'operatingMargin') };
}
export function comparisonAt(series: readonly ComparisonPoint[], date: string): ComparisonPoint | null {
    let found: ComparisonPoint | null = null;
    for (const point of series) if (point.date <= date && (!found || point.date >= found.date)) found = point;
    return found;
}

// eps is null when one-time items were removed from income (reported EPS still contains them); perShare is reported
// EPS / net income of a profitable report, i.e. 1 / diluted shares (a loss year's EPS uses basic shares).
type PeriodRow = { start?: string; end: string; eps: number | null; income: number | null; filed: Release | null; adjusted: boolean; perShare: number | null };
type Release = { date: string; estimated: boolean };
const days = (from: string, to: string) => (Date.parse(to) - Date.parse(from)) / 86_400_000;
// SEC companyfacts dates a figure by its newest filing, often next year's comparative, and TDnet/J-Quants only by
// release. A date beyond the 120-day overseas allowance (statementDate above) is replaced by that estimate.
function release(row: Record<string, any>, field: string): Release | null {
    const raw = row.publishedAt ?? row.evidence?.[field]?.filed ?? row.evidence?.releasedAt;
    const filed = typeof raw === 'string' ? chartDate(raw.slice(0, 10)) : null;
    const end = chartDate(String(row.end));
    if (!filed || !end) return null;
    const allowance = new Date(Date.parse(`${end}T00:00:00Z`) + 120 * 86_400_000).toISOString().slice(0, 10);
    return filed > allowance ? { date: allowance, estimated: true } : { date: filed, estimated: false };
}
const latest = (releases: Array<Release | null>) => !releases.length || releases.some(item => !item) ? null
    : (releases as Release[]).reduce((a, b) => b.date > a.date ? b : a);
function periodRow(row: Record<string, any>): PeriodRow {
    const field = number(row.epsDiluted) !== null ? 'epsDiluted' : 'epsBasic';
    const reportedEps = number(row[field]), reported = number(row.netIncome);
    // SEC payloads carry net income without one-time items (debt extinguishment, impairments); others are as reported.
    const adjusted = number(row.oneTimeItems) !== null && number(row.oneTimeItems) !== 0;
    const eps = adjusted ? null : reportedEps, income = adjusted ? number(row.netIncomeExcludingOneTime) : reported;
    const filed = [...(reportedEps !== null ? [release(row, field)] : []), ...(income !== null ? [release(row, 'netIncome') ?? release(row, field)] : [])];
    const perShare = reportedEps !== null && reported !== null && reportedEps > 0 && reported > 0 ? reportedEps / reported : null;
    return { start: row.start, end: String(row.end), eps, income, filed: latest(filed), adjusted, perShare };
}

/**
 * Historical overseas trailing P/E, never a current profile snapshot. Per period end, in order of exactness:
 * the annual EPS at a fiscal year end; four consecutive quarterly EPS; or, when quarters lack EPS (Japan files
 * year-to-date, US fiscal Q4 exists only in the 10-K), trailing net income scaled by that period's EPS/net income,
 * which keeps the latest share count instead of adding EPS across share-count changes.
 */
export function overseasPePoints(daily: Array<{ date: string; close?: number | null }>, financials: Record<string, any> = {}, currency: string): ComparisonPoint[] {
    const rows = (key: string) => (financials[key] ?? []).filter((row: any) => row.currency === currency && chartDate(String(row.end))).map(periodRow);
    const quarterly = rows('quarterly'), cumulative = rows('cumulative'), annual = rows('annual');
    const quarters = new Map<string, PeriodRow>();
    for (const row of quarterly) quarters.set(row.end, row);
    // A quarter missing entirely (US fiscal Q4) is the year-to-date total less the year-to-date one quarter earlier.
    const toDate = [...quarterly, ...cumulative, ...annual].filter(row => row.start && row.income !== null);
    for (const row of [...cumulative, ...annual]) {
        if (quarters.get(row.end)?.income != null) continue;
        const prior = toDate.filter(other => other.start === row.start && other.end < row.end && days(other.end, row.end) >= 60 && days(other.end, row.end) <= 120).at(-1);
        if (prior && row.income !== null) quarters.set(row.end, { end: row.end, eps: null, income: row.income - prior.income!,
            filed: latest([row.filed, prior.filed]), adjusted: row.adjusted || prior.adjusted, perShare: null });
    }
    const ordered = [...quarters.values()].sort((a, b) => a.end.localeCompare(b.end));
    // Losses are kept so a newer loss blanks the PE rather than leaving the last profitable period on screen.
    const trailing: Array<{ end: string; release: Release; eps: number; adjusted: boolean }> = [];
    const add = (end: string, eps: number | null, filed: Release | null, adjusted = false) => {
        if (eps !== null && filed && !trailing.some(row => row.end === end)) trailing.push({ end, release: filed, eps, adjusted });
    };
    const reports = [...quarterly, ...cumulative, ...annual];
    for (const row of annual) if (days(row.start ?? row.end, row.end) >= 330) add(row.end, row.eps, row.filed);
    for (let i = 3; i < ordered.length; i++) {
        const four = ordered.slice(i - 3, i + 1), end = four[3].end;
        if (!four.slice(1).every((row, j) => days(four[j].end, row.end) >= 60 && days(four[j].end, row.end) <= 120)) continue;
        const filed = latest(four.map(row => row.filed));
        if (four.every(row => row.eps !== null)) { add(end, four.reduce((total, row) => total + row.eps!, 0), filed); continue; }
        if (!four.every(row => row.income !== null)) continue;
        // Shares from that period's report, or the latest profitable one before it (first listed wins a tie: quarterly).
        const scale = reports.filter(row => row.end <= end && row.perShare !== null)
            .reduce<PeriodRow | null>((best, row) => !best || row.end > best.end ? row : best, null);
        if (scale) add(end, four.reduce((total, row) => total + row.income!, 0) * scale.perShare!, latest([filed, scale.filed]), four.some(row => row.adjusted));
    }
    return daily.flatMap(bar => {
        const eps = trailing.filter(row => row.release.date <= bar.date).sort((a, b) => a.end.localeCompare(b.end)).at(-1);
        const close = number(bar.close);
        return eps && eps.eps > 0 && close !== null && close > 0
            ? [{ date: bar.date, value: close / eps.eps, period: eps.end, estimated: eps.release.estimated, adjusted: eps.adjusted }] : [];
    });
}
