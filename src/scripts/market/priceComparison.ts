import { chartDate } from './chartViewport';
export const PRICE_METRICS = ['pe', 'inventoryDays', 'operatingMargin', 'none'] as const;
export type PriceMetric = typeof PRICE_METRICS[number];
export type PricePoint = { date: string; sources: Record<string, Record<string, any>> };
export type Candle = { date: string; open: number; high: number; low: number; close: number; volume: number | null; pe: number | null };
const number = (value: unknown): number | null => typeof value === 'number' && Number.isFinite(value) ? value : null;
export function priceCandles(points: readonly PricePoint[], sources: string[], volumeField: string): Candle[] {
    return points.flatMap(point => {
        const values = sources.map(key => point.sources[key]).find(row => ['open', 'high', 'low', 'close'].every(key => number(row?.[key]) !== null));
        if (!values) return [];
        const pe = number(point.sources['twse:valuation']?.pe_ratio) ?? number(point.sources['tpex:valuation']?.pe_ratio) ?? number(point.sources['financials:trailing-pe']?.pe_ratio);
        return [{ date: point.date, open: values.open, high: values.high, low: values.low, close: values.close,
            volume: number(values[volumeField]), pe: pe !== null && pe > 0 ? pe : null }];
    }).sort((a, b) => a.date.localeCompare(b.date));
}
export type ComparisonPoint = { date: string; period: string; value: number; estimated: boolean };
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

/** Historical overseas P/E from four consecutive reported quarters, never a current profile snapshot. */
export function overseasPePoints(daily: Array<{ date: string; close?: number | null }>, financials: Record<string, any> = {}, currency: string): ComparisonPoint[] {
    const quarters = (financials.quarterly ?? []).filter((row: any) => row.currency === currency && number(row.epsDiluted ?? row.epsBasic) !== null)
        .sort((a: any, b: any) => String(a.end).localeCompare(String(b.end)));
    const trailing: Array<{ end: string; date: string; eps: number }> = [];
    for (let i = 3; i < quarters.length; i++) {
        const four = quarters.slice(i - 3, i + 1);
        const consecutive = four.slice(1).every((row: any, j: number) => {
            const gap = (Date.parse(row.end) - Date.parse(four[j].end)) / 86_400_000;
            return gap >= 60 && gap <= 120;
        });
        // Evidence may be a later restatement: use that filing date so future filings are not leaked backwards.
        const filed = four.map((row: any) => row.publishedAt ?? row.evidence?.[row.epsDiluted != null ? 'epsDiluted' : 'epsBasic']?.filed);
        const sum = four.reduce((total: number, row: any) => total + (row.epsDiluted ?? row.epsBasic), 0);
        if (consecutive && sum > 0 && filed.every((value: any) => typeof value === 'string' && chartDate(value.slice(0, 10)))) {
            trailing.push({ end: four[3].end, date: filed.map((value: string) => value.slice(0, 10)).sort().at(-1)!, eps: sum });
        }
    }
    return daily.flatMap(bar => {
        const eps = trailing.filter(row => row.date <= bar.date).sort((a, b) => a.end.localeCompare(b.end)).at(-1);
        const close = number(bar.close);
        return eps && close !== null && close > 0 ? [{ date: bar.date, value: close / eps.eps, period: eps.end, estimated: false }] : [];
    });
}
