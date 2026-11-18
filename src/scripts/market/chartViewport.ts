/** Calendar windows shared by every time-series chart. No data is interpolated. */
export type ChartRange = 'day' | 'week' | 'month' | 'year' | 'threeYears' | 'fiveYears' | 'all';
export type ChartWindow = { start: string; end: string };
export const CHART_RANGES: readonly ChartRange[] = ['day', 'week', 'month', 'year', 'fiveYears', 'all'];
const MACRO_RANGES = ['threeYears', 'fiveYears'] as const;
const isMacroChart = (key: string) => key.startsWith('macro:');
const DAY = 86_400_000;
export function chartDate(period: string): string | null {
    const quarter = /^(\d{4})\s?Q([1-4])$/.exec(period);
    if (quarter) return new Date(Date.UTC(Number(quarter[1]), Number(quarter[2]) * 3, 0)).toISOString().slice(0, 10);
    if (/^\d{4}$/.test(period)) return `${period}-12-31`;
    if (/^\d{4}-\d{2}$/.test(period)) {
        const month = Number(period.slice(5));
        return month >= 1 && month <= 12 ? new Date(Date.UTC(Number(period.slice(0, 4)), month, 0)).toISOString().slice(0, 10) : null;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(period)) return null;
    const time = Date.parse(`${period}T00:00:00Z`);
    return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === period ? period : null;
}
const iso = (time: number) => new Date(time).toISOString().slice(0, 10);
const instant = (date: string) => Date.parse(`${date}T00:00:00Z`);
function bounds(dates: string[]) {
    const valid = dates.map(chartDate).filter((d): d is string => d !== null).sort();
    return valid.length ? { start: valid[0], end: valid[valid.length - 1] } : null;
}
export function rangeWindow(dates: string[], range: ChartRange): ChartWindow | null {
    const full = bounds(dates); if (!full || range === 'all') return full;
    const end = new Date(`${full.end}T00:00:00Z`);
    if (range === 'day') return { start: full.end, end: full.end };
    if (range === 'week') return { start: iso(end.getTime() - 6 * DAY), end: full.end };
    const months = range === 'month' ? 1 : range === 'year' ? 12 : range === 'threeYears' ? 36 : 60;
    const first = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - months, 1));
    const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
    first.setUTCDate(Math.min(end.getUTCDate(), lastDay));
    return { start: iso(first.getTime()), end: full.end };
}
export function visibleRows<T>(rows: readonly T[], date: (row: T) => string, window: ChartWindow | null): T[] {
    return rows.filter(row => {
        const day = chartDate(date(row));
        return day && (!window || day >= window.start && day <= window.end);
    }).sort((a, b) => chartDate(date(a))!.localeCompare(chartDate(date(b))!));
}
export function zoomWindow(dates: string[], current: ChartWindow | null, delta: number, anchor: number): ChartWindow | null {
    const full = bounds(dates); if (!full) return null;
    const min = instant(full.start), max = instant(full.end);
    const from = Math.max(min, instant(current?.start ?? full.start));
    const to = Math.min(max, instant(current?.end ?? full.end));
    const span = Math.max(DAY, to - from);
    const next = Math.min(max - min, Math.max(DAY, span * (delta < 0 ? .75 : 1.5)));
    const fraction = Math.max(0, Math.min(1, anchor));
    const center = from + (to - from) * fraction;
    const start = Math.max(min, Math.min(max - next, center - next * fraction));
    return { start: iso(start), end: iso(start + next) };
}
type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;
export function readChartPreference<T extends string>(storage: StorageLike | undefined, key: string, allowed: readonly T[], fallback: T): T {
    try { const value = storage?.getItem(key); return allowed.includes(value as T) ? value as T : fallback; } catch { return fallback; }
}
export function writeChartPreference(storage: StorageLike | undefined, key: string, value: string) {
    try { storage?.setItem(key, value); } catch { /* Browser storage may be blocked. */ }
}

type ViewState = { range: ChartRange | 'custom'; window: ChartWindow | null; anchorEnd: string };
const states = new Map<string, ViewState>();
function browserStorage() { try { return window.localStorage; } catch { return undefined; } }
export function chartView(key: string, dates: string[]) {
    const end = bounds(dates)?.end ?? '';
    let state = states.get(key);
    if (!state) {
        const range = readChartPreference(browserStorage(), `market-chart-range:${key}`, isMacroChart(key) ? MACRO_RANGES : CHART_RANGES, isMacroChart(key) ? 'threeYears' : 'year');
        state = { range, window: rangeWindow(dates, range), anchorEnd: end }; states.set(key, state);
    } else if (state.range !== 'custom' && state.anchorEnd !== end) {
        state.window = rangeWindow(dates, state.range); state.anchorEnd = end;
    }
    return state;
}
export function addChartControls(target: HTMLElement, key: string, dates: string[], redraw: () => void, zh: boolean) {
    const state = chartView(key, dates);
    const controls = document.createElement('div'); controls.className = 'market-chart-controls';
    controls.setAttribute('role', 'group'); controls.setAttribute('aria-label', zh ? '圖表時間範圍' : 'Chart time range');
    const labels = zh ? ['日', '週', '月', '年', '5 年', '全部'] : ['1D', '1W', '1M', '1Y', '5Y', 'All'];
    const ranges = isMacroChart(key) ? MACRO_RANGES : CHART_RANGES;
    const rangeLabels = isMacroChart(key) ? (zh ? ['3 年', '5 年'] : ['3Y', '5Y']) : labels;
    ranges.forEach((range, i) => {
        const button = document.createElement('button'); button.type = 'button'; button.textContent = rangeLabels[i];
        button.setAttribute('aria-pressed', String(state.range === range));
        button.addEventListener('click', () => {
            state.range = range; state.window = rangeWindow(dates, range);
            writeChartPreference(browserStorage(), `market-chart-range:${key}`, range); redraw();
        }); controls.append(button);
    });
    const coverage = document.createElement('span'); coverage.className = 'market-chart-coverage';
    const full = bounds(dates);
    coverage.textContent = full ? `${zh ? '資料' : 'Data'} ${full.start} — ${full.end}` : (zh ? '尚無資料' : 'No data');
    controls.append(coverage); target.prepend(controls);
}
const wheelHandlers = new WeakMap<SVGSVGElement, (event: WheelEvent) => void>();
/** 2026-11-18: the mouse wheel no longer zooms a chart (it hijacked page scrolling and was hard to control). The time range
 *  is changed with the range buttons only. Kept under its old name so every chart still calls it; it just removes any
 *  wheel listener an earlier version of the page left on the SVG. */
export function bindChartZoom(svg: SVGSVGElement, _key: string, _dates: string[], _redraw: () => void, _plot = { left: 0, right: 1 }) {
    const previous = wheelHandlers.get(svg);
    if (previous) { svg.removeEventListener('wheel', previous); wheelHandlers.delete(svg); }
}
