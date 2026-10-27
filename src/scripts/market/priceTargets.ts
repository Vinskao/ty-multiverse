import type { ChartWindow } from './chartViewport';

export type TargetAction = { firm: string; date: string; action: string | null; rating: string | null; previousRating: string | null;
    target: number | null; previousTarget: number | null; currency: string; source: string; sourceUrl: string;
    thesis?: string | null; reportId?: string | null };
/** A public report claim about the stock, dated by the report's publication (or the claim's data date). */
export type TargetView = { reportId: string; title: string; publisher: string; date: string | null; page: number; dimension: string;
    direction: string; claim: string; evidence: string };
export type TargetConsensus = { date: string; mean: number | null; median: number | null; high: number | null; low: number | null;
    analysts: number | null; currency: string; source: string };
export type ClosePoint = { date: string; close: number };
export type LatestTarget = TargetAction & { target: number; change: number | null; upside: number | null; stale: boolean };

const DAY = 86_400_000;
const byFirmThenDate = (a: { firm: string; date: string }, b: { firm: string; date: string }) => b.date.localeCompare(a.date) || a.firm.localeCompare(b.firm);

/** Each broker's newest target (a rating-only note does not erase it). Brokers' targets are 12-month views. */
export function latestTargets(actions: readonly TargetAction[], last: ClosePoint | null): LatestTarget[] {
    const latest = new Map<string, TargetAction>();
    for (const row of actions) {
        if (row.target === null || !(row.target > 0)) continue;
        const known = latest.get(row.firm);
        if (!known || row.date > known.date) latest.set(row.firm, row);
    }
    const asOf = last?.date ?? [...latest.values()].map(row => row.date).sort().at(-1) ?? '';
    return [...latest.values()].map(row => ({
        ...row, target: row.target!,
        change: row.previousTarget ? row.target! / row.previousTarget - 1 : null,
        upside: last && last.close > 0 ? row.target! / last.close - 1 : null,
        stale: Date.parse(asOf) - Date.parse(row.date) > 365 * DAY,
    })).sort(byFirmThenDate);
}

/** The brokers with the most targets get their own color; the rest share the "other" color. */
export function firmColors(actions: readonly TargetAction[], palette: readonly string[], max = palette.length): Map<string, string> {
    const counts = new Map<string, number>();
    for (const row of actions) if (row.target !== null) counts.set(row.firm, (counts.get(row.firm) ?? 0) + 1);
    const ranked = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, Math.min(max, palette.length));
    return new Map(ranked.map(([firm], i) => [firm, palette[i]]));
}

export type TargetSeries = { dates: string[]; close: Array<number | null>; consensus: Array<TargetConsensus | null>;
    dots: Array<{ date: string; firm: string; target: number; action: TargetAction }> };

/** Dates with a close, a consensus snapshot or a broker target inside the window; the consensus holds until the next one. */
export function targetSeries(actions: readonly TargetAction[], consensus: readonly TargetConsensus[], closes: readonly ClosePoint[],
                             window: ChartWindow | null): TargetSeries {
    const inside = (date: string) => !window || date >= window.start && date <= window.end;
    const withTarget = actions.filter(row => row.target !== null && row.target > 0);
    const dates = [...new Set([...closes.map(p => p.date), ...consensus.map(p => p.date), ...withTarget.map(p => p.date)])].filter(inside).sort();
    const closeByDate = new Map(closes.map(p => [p.date, p.close]));
    const snapshots = [...consensus].filter(row => row.mean !== null).sort((a, b) => a.date.localeCompare(b.date));
    return {
        dates,
        close: dates.map(date => closeByDate.get(date) ?? null),
        consensus: dates.map(date => snapshots.filter(row => row.date <= date).at(-1) ?? null),
        dots: withTarget.filter(row => inside(row.date)).sort((a, b) => a.date.localeCompare(b.date) || a.firm.localeCompare(b.firm))
            .map(row => ({ date: row.date, firm: row.firm, target: row.target!, action: row })),
    };
}

/** Closes for the target chart: Taiwan history points (TWSE or TPEx daily price) or overseas daily bars. */
export function historyCloses(points?: ReadonlyArray<{ date: string; sources: Record<string, Record<string, any>> }>,
                              daily?: ReadonlyArray<{ date: string; close?: number | null }>): ClosePoint[] {
    const rows = points
        ? points.map(p => ({ date: p.date, close: p.sources['twse:daily-price']?.close ?? p.sources['tpex:daily-price']?.close }))
        : (daily ?? []).map(bar => ({ date: bar.date, close: bar.close }));
    return rows.filter((row): row is ClosePoint => typeof row.close === 'number' && Number.isFinite(row.close) && row.close > 0)
        .sort((a, b) => a.date.localeCompare(b.date));
}

const newestFirst = (a: TargetView, b: TargetView) => (b.date ?? '').localeCompare(a.date ?? '') || a.page - b.page;

/** The views behind a broker's call: the claims of the report it came from, else that broker's own views on the same day. */
export function actionViews(action: TargetAction, views: readonly TargetView[]): TargetView[] {
    const linked = action.reportId
        ? views.filter((view) => view.reportId === action.reportId)
        : views.filter((view) => view.publisher === action.firm && view.date === action.date);
    return [...linked].sort(newestFirst);
}

/** Dated views inside the chart window (all dated views without one), newest first. */
export function viewsInWindow(views: readonly TargetView[], window: ChartWindow | null): TargetView[] {
    return views.filter((view) => view.date && (!window || view.date >= window.start && view.date <= window.end)).sort(newestFirst);
}
