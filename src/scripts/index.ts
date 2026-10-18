import type { Portfolio, PortfolioPosition, RegionFigures } from '../types/portfolio';
import { taiwanPortfolio } from '../services/core/taiwanPortfolio';
// 加上tooltip
// 使用 astro:page-load 來支援 View Transitions 的客戶端導航
import { serviceAvailabilityManager } from '../services/core/serviceAvailabilityManager';
import { SERVICE_KEYS } from '../common/constants/serviceKeys';
import { config } from '../services/core/config';
import i18nData from '../storages/i18n.json';
import { shiftMacroPeriod, macroHistoryLimit, macroSeriesPoints, resolveMacroCode, dedupeMacroEvents, macroEventInstant, MACRO_FOREIGN_EVENT, macroAxisRange, MACRO_SERIES_TONES, macroValueAtOrBefore, macroPeriodLabel, type MacroSeriesTone, type MacroSeriesFormat } from './market/macroSeries';
import { TDCC_BUCKETS, tdccBuckets, tdccChangeSeries } from './market/tdcc';
import { formatNumber, formatWithUnit, formatAxisTick, numberKindFor, publishedDigits, type NumberKind } from './format/numbers';
import { analysisRating } from './market/analysisRating';
import { isTaiwanInstrument, analysisRecordCode, instrumentMarketLabel } from './market/instrumentIdentity';
import { parseResearchRecord, researchRecordCode, researchViewTone, researchLeanTone, RESEARCH_DIMENSIONS } from './market/researchMap';
import { getMermaidConfig } from './mermaid-theme';
import { overseasDetailTabs, overseasHistoryPoints, overseasFundamentalsPayload, OVERSEAS_PRICE_SOURCE, type OverseasResearch } from './market/overseasResearch';
import { buildResearchContext, brokerAvailabilityLabel } from './market/researchContext';
import { MACRO_MERGED_CHARTS, macroChartNeedsSeparateAxes } from './market/macroLayout';
import { MACRO_GROUP_SPECS, type MacroText } from './market/macroGroups';
import { MACRO_GROWTH_CHARTS, macroGrowthMode, macroGrowthModes, setMacroGrowthMode, macroMoneyStock, type MacroGrowthMode } from './market/macroGrowth';

let _leetcodeAvailabilityCleanup: (() => void) | null = null;
let _marketQuoteTimer: number | null = null;
let _portfolioTimer: number | null = null;
let _marketEventsTimer: number | null = null;
let _macroRefreshTimer: number | null = null;
let _marketLangCleanup: (() => void) | null = null;
let selectedMarketInstrument: DashboardInstrument | null = null;
const marketHistoryCache = new Map<string, { payload: MarketHistoryPayload; fetchedAt: number }>();
const MARKET_HISTORY_CACHE_TTL_MS = 5 * 60 * 1000;

const marketChartLayouts = new Map<HTMLElement, { width: number; redraw: () => void }>();
let marketChartResizeObserver: ResizeObserver | null = null;
function observeMarketChart(target: HTMLElement, redraw: () => void) {
    if (!marketChartResizeObserver) {
        marketChartResizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const chart = marketChartLayouts.get(entry.target as HTMLElement);
                const width = (entry.target as HTMLElement).clientWidth;
                if (chart && width > 0 && Math.abs(width - chart.width) > 1) chart.redraw();
            }
        });
    }
    marketChartLayouts.set(target, { width: target.clientWidth, redraw });
    marketChartResizeObserver.observe(target);
}
document.addEventListener('astro:before-swap', () => {
    marketChartResizeObserver?.disconnect();
    marketChartLayouts.clear();
});

// Phones: the chart panel opens directly under the tapped row (accordion) instead of at the bottom of the
// whole watchlist. Wider screens keep it in the right-hand column.
const MARKET_ACCORDION_QUERY = '(max-width: 768px)';
let marketDetailRow: HTMLElement | null = null;
// The tab the user last picked; kept when switching to another instrument.
let preferredMarketTab: string | null = null;
type MarketCompanyEvent = { code: string; name: string; type: 'monthly_revenue' | 'financial_report' | 'investor_conference'; period?: string; date: string; dateTime?: string; status: 'recent' | 'upcoming'; highlight: boolean; source?: string; sourceUrl?: string };
let marketEventsByCode = new Map<string, MarketCompanyEvent[]>();
let marketEventInstruments = new Map<string, DashboardInstrument>();
let marketAutoInstruments: DashboardInstrument[] = [];
let marketCustomInstruments: DashboardInstrument[] = [];

function placeMarketDetail(row: HTMLElement | null, scroll = true) {
    const detail = document.getElementById('market-instrument-detail');
    const section = document.getElementById('market-chart-section');
    if (!detail || !section) return;
    marketDetailRow = row;
    const accordion = window.matchMedia(MARKET_ACCORDION_QUERY).matches;
    if (accordion && row) {
        if (row.nextElementSibling !== detail) row.after(detail);
        detail.classList.add('market-instrument-detail--inline');
        const top = row.getBoundingClientRect().top;
        if (scroll && (top < 0 || top > window.innerHeight * 0.35)) row.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (detail.parentElement !== section) {
        section.prepend(detail);
        detail.classList.remove('market-instrument-detail--inline');
    }
}

function initMarketWatchlist() {
    const row = document.getElementById('txf-quote-section') as HTMLButtonElement | null;
    const detail = document.getElementById('market-instrument-detail');
    if (!row || !detail || row.dataset.bound === 'true') return;
    row.dataset.bound = 'true';
    row.addEventListener('click', () => {
        const expanded = row.getAttribute('aria-expanded') === 'true';
        row.setAttribute('aria-expanded', String(!expanded));
        document.querySelectorAll<HTMLButtonElement>('.market-watch-row--selected').forEach((item) => item.setAttribute('aria-expanded', 'false'));
        detail.hidden = expanded;
        const placeholder = document.getElementById('market-chart-placeholder');
        if (placeholder) placeholder.hidden = !expanded;
        if (!expanded) {
            setMarketDetailInstrument({ code: 'TXF', name: 'TAIEX Futures', productType: 'futures' });
            placeMarketDetail(row);
        }
    });
    document.querySelectorAll<HTMLButtonElement>('[data-market-tab]').forEach((tab) => {
        tab.addEventListener('click', () => {
            if (tab.disabled) return;
            preferredMarketTab = tab.dataset.marketTab || 'price';
            selectMarketDetailTab(preferredMarketTab);
        });
    });
    // Rotating the phone or resizing across the breakpoint moves the open panel to the right place.
    window.matchMedia(MARKET_ACCORDION_QUERY).addEventListener('change', () => {
        const panel = document.getElementById('market-instrument-detail');
        if (panel && !panel.hidden) placeMarketDetail(marketDetailRow, false);
    });
}

interface DashboardInstrument {
    code: string; name: string; productType: 'stock' | 'futures';
    market?: string;  // TW, US, JP, KR…; overseas codes can share digits with Taiwan codes (6857)
    underlyingCode?: string;
    quote?: TxfQuote | null;
}
interface MarketDashboardPayload {
    fixed: DashboardInstrument;
    automatic: { snapshotAt: string | null; positions: DashboardInstrument[] };
    custom: DashboardInstrument[];
}

type MarketHistoryValues = Record<string, number>;
interface MarketHistoryPoint { date: string; code: string; name: string; sources: Record<string, MarketHistoryValues> }
interface MarketHistoryPayload { code: string; points: MarketHistoryPoint[] }

function marketI18n(key: string, fallback: string) {
    const language = String((window as any).AppLang?.get?.() || 'en').toLowerCase().startsWith('zh') ? 'zh' : 'en';
    return (i18nData as any).home?.[key]?.[language] || fallback;
}

// Inline bilingual text for composed phrases that do not warrant an i18n.json key.
function marketText(en: string, zh: string) {
    return marketLocale() === 'zh-TW' ? zh : en;
}
const vsQuarter = () => marketText('QoQ', '較上季');
const vsYear = () => marketText('YoY', '較去年同期');

function historyValue(point: MarketHistoryPoint, sourceKeys: string[], field: string): number | null {
    for (const source of sourceKeys) {
        const value = point.sources[source]?.[field];
        if (typeof value === 'number') return value;
    }
    return null;
}

// negative: an outflow (sells, borrowed-stock sales) is drawn below the zero axis as a negative value.
interface HistoryChartField { label: string; color: string; sourceKeys: string[]; field: string; negative?: boolean; tooltip?: (point: MarketHistoryPoint, value: number) => string }
interface HistoryChartOptions { bars?: boolean; height?: number; format?: (value: number) => string; legend?: boolean; area?: boolean }

function marketLocale() {
    return String((window as any).AppLang?.get?.() || 'en').toLowerCase().startsWith('zh') ? 'zh-TW' : 'en-US';
}

function compactNumber(value: number, digits = 1): string {
    if (!Number.isFinite(value)) return '—';
    return Math.abs(value) >= 10_000
        ? new Intl.NumberFormat(marketLocale(), { notation: 'compact', maximumFractionDigits: digits }).format(value)
        : value.toLocaleString(marketLocale(), { maximumFractionDigits: 2 });
}

// Rounds the value range outward to 1/2/2.5/5×10ⁿ steps so axis labels read 0, 25, 50…
function niceScale(low: number, high: number, count = 4) {
    if (low === high) { const pad = Math.abs(low) * .05 || 1; low -= pad; high += pad; }
    const raw = (high - low) / count; const magnitude = 10 ** Math.floor(Math.log10(raw));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((candidate) => candidate >= raw) ?? raw;
    const niceLow = Math.floor(low / step) * step; const niceHigh = Math.ceil(high / step) * step;
    const ticks: number[] = [];
    for (let value = niceLow; value <= niceHigh + step / 2; value += step) ticks.push(Number(value.toPrecision(12)));
    return { low: niceLow, high: niceHigh, ticks };
}

function svgEl<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}, className?: string): SVGElementTagNameMap[K] {
    const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, String(value));
    if (className) element.setAttribute('class', className);
    return element;
}

function drawMarketHistoryChart(targetId: string, points: MarketHistoryPoint[], fields: HistoryChartField[], options: HistoryChartOptions = {}) {
    const target = document.getElementById(targetId);
    if (!target) return;
    observeMarketChart(target, () => drawMarketHistoryChart(targetId, points, fields, options));
    target.replaceChildren();
    const bars = Boolean(options.bars);
    const format = options.format ?? ((value: number) => compactNumber(value));
    const series = fields.map((field) => ({ ...field, values: points.map((point) => {
        const value = historyValue(point, field.sourceKeys, field.field);
        return value !== null && field.negative ? -Math.abs(value) : value;
    }) }));
    const values = series.flatMap((item) => item.values.filter((value): value is number => value !== null));
    if (!points.length || !values.length) { target.textContent = marketI18n('marketHistoryNoRows', 'Historical data is not available yet.'); return; }

    const width = Math.max(220, Math.min(900, target.clientWidth || 900)); const height = options.height ?? 260;
    const left = 58; const right = width - 14; const top = 12; const bottom = height - 30;
    let low = Math.min(...values); let high = Math.max(...values);
    if (bars) { low = Math.min(0, low); high = Math.max(0, high); }
    else { const pad = (high - low) * .1; low -= pad; high += pad; }
    const scale = niceScale(low, high, height < 200 ? 3 : 4);
    const slot = (right - left) / Math.max(points.length, 1);
    const x = (i: number) => bars ? left + slot * (i + .5) : left + (points.length < 2 ? (right - left) / 2 : i / (points.length - 1) * (right - left));
    const y = (v: number) => top + ((scale.high - v) / (scale.high - scale.low)) * (bottom - top);

    const svg = svgEl('svg', { viewBox: `0 0 ${width} ${height}`, role: 'img' }, 'market-history-chart');
    svg.setAttribute('aria-label', fields.map((field) => field.label).join(' / '));
    const band = svgEl('rect', { y: top, height: bottom - top, width: slot }, 'market-history-band'); band.style.display = 'none'; svg.append(band);
    for (const tick of scale.ticks) {
        svg.append(svgEl('line', { x1: left, x2: right, y1: y(tick), y2: y(tick) }, tick === 0 && scale.low < 0 ? 'market-history-zero' : 'market-history-grid'));
        const label = svgEl('text', { x: left - 10, y: y(tick) + 4, 'text-anchor': 'end' }, 'market-history-axis-label');
        label.textContent = format(tick); svg.append(label);
    }
    const sameYear = points[0].date.length > 7 && points[0].date.slice(0, 4) === points[points.length - 1].date.slice(0, 4);
    const tickCount = Math.min(points.length, width < 480 ? 3 : height < 200 ? 4 : 6);
    for (let tick = 0; tick < tickCount; tick++) {
        const index = Math.round(tick * (points.length - 1) / Math.max(tickCount - 1, 1));
        const anchor = bars ? 'middle' : tick === 0 ? 'start' : tick === tickCount - 1 ? 'end' : 'middle';
        const label = svgEl('text', { x: x(index), y: height - 8, 'text-anchor': anchor }, 'market-history-axis-label');
        label.textContent = sameYear ? points[index].date.slice(5) : points[index].date; svg.append(label);
    }

    const hoverDots: (SVGCircleElement | null)[] = [];
    series.forEach((item, si) => {
        if (bars) {
            const w = Math.max(1.5, Math.min(18, slot * .78 / series.length));
            item.values.forEach((v, i) => {
                if (v === null) return;
                svg.append(svgEl('rect', { x: x(i) - w * series.length / 2 + si * w + w * .06, y: Math.min(y(0), y(v)), width: w * .88,
                    height: Math.max(1, Math.abs(y(0) - y(v))), rx: Math.min(2, w / 4), fill: item.color }, 'market-history-bar'));
            });
            hoverDots.push(null);
            return;
        }
        const coords = item.values.map((v, i) => v === null ? null : [x(i), y(v)] as const).filter((c): c is readonly [number, number] => c !== null);
        if (!coords.length) { hoverDots.push(null); return; }
        const line = coords.map((c, n) => `${n ? 'L' : 'M'} ${c[0]} ${c[1]}`).join(' ');
        if (options.area ?? series.length === 1) {
            const gradientId = `${targetId}-fill-${si}`;
            const gradient = svgEl('linearGradient', { id: gradientId, x1: 0, x2: 0, y1: 0, y2: 1 });
            gradient.append(svgEl('stop', { offset: '0%', 'stop-color': item.color, 'stop-opacity': .28 }), svgEl('stop', { offset: '100%', 'stop-color': item.color, 'stop-opacity': 0 }));
            const defs = svgEl('defs'); defs.append(gradient); svg.append(defs);
            svg.append(svgEl('path', { d: `${line} L ${coords[coords.length - 1][0]} ${bottom} L ${coords[0][0]} ${bottom} Z`, fill: `url(#${gradientId})` }));
        }
        svg.append(svgEl('path', { d: line, stroke: item.color }, 'market-history-line'));
        const last = coords[coords.length - 1];
        svg.append(svgEl('circle', { cx: last[0], cy: last[1], r: 3.5, fill: item.color }, 'market-history-last'));
        const hover = svgEl('circle', { r: 4.5, fill: item.color }, 'market-history-hover-dot');
        hover.style.display = 'none'; svg.append(hover); hoverDots.push(hover);
    });
    const guide = svgEl('line', { y1: top, y2: bottom }, 'market-history-guide'); guide.style.display = 'none'; svg.append(guide);
    target.append(svg);

    if (options.legend ?? series.length > 1) {
        const legend = document.createElement('div'); legend.className = 'market-history-legend';
        series.forEach((item) => { const label = document.createElement('span'); const dot = document.createElement('i'); dot.style.background = item.color; label.append(dot, document.createTextNode(item.label)); legend.append(label); });
        target.append(legend);
    }
    // Readout replaces native <title> tooltips: shows the latest point at rest, the hovered point on move.
    const readout = document.createElement('div'); readout.className = 'market-chart-readout market-chart-readout--compact'; readout.setAttribute('aria-live', 'polite');
    let latestIndex = points.length - 1;
    while (latestIndex > 0 && series.every((item) => item.values[latestIndex] === null)) latestIndex--;
    const describe = (i: number, isLatest: boolean) => {
        readout.replaceChildren();
        const date = document.createElement('strong');
        date.textContent = isLatest ? `${points[i].date} · ${marketI18n('marketHistoryLatestShort', 'latest')}` : points[i].date; readout.append(date);
        series.forEach((item) => {
            const value = item.values[i]; const chip = document.createElement('span'); const dot = document.createElement('i'); dot.style.background = item.color;
            chip.append(dot, document.createTextNode(`${series.length > 1 ? `${item.label} ` : ''}${value === null ? '—' : (item.tooltip?.(points[i], value) || value.toLocaleString(marketLocale()))}`));
            readout.append(chip);
        });
    };
    describe(latestIndex, true);
    target.append(readout);

    svg.addEventListener('pointermove', (event) => {
        const rect = svg.getBoundingClientRect(); const viewX = (event.clientX - rect.left) / rect.width * width;
        const raw = bars ? Math.floor((viewX - left) / slot) : Math.round((viewX - left) / Math.max(right - left, 1) * (points.length - 1));
        const i = Math.max(0, Math.min(points.length - 1, raw));
        guide.setAttribute('x1', String(x(i))); guide.setAttribute('x2', String(x(i))); guide.style.display = bars ? 'none' : '';
        band.setAttribute('x', String(left + slot * i)); band.style.display = bars ? '' : 'none';
        series.forEach((item, si) => {
            const dot = hoverDots[si]; if (!dot) return; const value = item.values[i];
            if (value === null) { dot.style.display = 'none'; return; }
            dot.setAttribute('cx', String(x(i))); dot.setAttribute('cy', String(y(value))); dot.style.display = '';
        });
        describe(i, false);
    });
    svg.addEventListener('pointerleave', () => {
        guide.style.display = 'none'; band.style.display = 'none';
        hoverDots.forEach((dot) => { if (dot) dot.style.display = 'none'; });
        describe(latestIndex, true);
    });
}

function drawMarketOHLCVolumeChart(targetId: string, points: MarketHistoryPoint[], sourceKeys: string[], volumeField: string) {
    const target = document.getElementById(targetId); if (!target) return;
    target.replaceChildren();
    const candles = points.map((point) => {
        const values = sourceKeys.map((key) => point.sources[key]).find((item) =>
            ['open', 'high', 'low', 'close'].every((field) => typeof item?.[field] === 'number'));
        return values ? { date: point.date, open: values.open, high: values.high, low: values.low,
            close: values.close, volume: values[volumeField] } : null;
    });
    if (!candles.some(Boolean)) { target.textContent = marketI18n('marketHistoryNoRows', 'Historical data is not available yet.'); return; }
    const ns = 'http://www.w3.org/2000/svg'; const svg = document.createElementNS(ns, 'svg');
    observeMarketChart(target, () => drawMarketOHLCVolumeChart(targetId, points, sourceKeys, volumeField));
    const width = Math.max(220, Math.min(900, target.clientWidth || 900));
    svg.setAttribute('viewBox', `0 0 ${width} 370`); svg.classList.add('market-history-chart');
    const valid = candles.filter((item): item is NonNullable<typeof item> => item !== null);
    let low = Math.min(...valid.map((item) => item.low)); let high = Math.max(...valid.map((item) => item.high));
    const priceSpan = high - low || Math.max(Math.abs(high) * .05, 1); low -= priceSpan * .04; high += priceSpan * .04;
    const maxVolume = Math.max(...valid.map((item) => item.volume || 0), 1);
    const left = 82; const right = width - 12; const priceTop = 16; const priceBottom = 230; const volumeTop = 258; const volumeBottom = 310;
    const slot = (right - left) / Math.max(candles.length, 1); const candleWidth = Math.max(1.5, Math.min(9, slot * .64));
    const yPrice = (value: number) => priceTop + ((high - value) / (high - low)) * (priceBottom - priceTop);
    candles.forEach((item, index) => {
        if (!item) return;
        const x = left + slot * (index + .5); const color = item.close >= item.open ? '#e45b5b' : '#46a77f';
        const wick = document.createElementNS(ns, 'line'); wick.setAttribute('x1', String(x)); wick.setAttribute('x2', String(x));
        wick.setAttribute('y1', String(yPrice(item.high))); wick.setAttribute('y2', String(yPrice(item.low))); wick.setAttribute('stroke', color); wick.setAttribute('stroke-width', '1.2'); svg.append(wick);
        const body = document.createElementNS(ns, 'rect'); const yOpen = yPrice(item.open); const yClose = yPrice(item.close);
        body.setAttribute('x', String(x - candleWidth / 2)); body.setAttribute('y', String(Math.min(yOpen, yClose)));
        body.setAttribute('width', String(candleWidth)); body.setAttribute('height', String(Math.max(1, Math.abs(yOpen - yClose))));
        body.setAttribute('fill', color); svg.append(body);
        if (typeof item.volume === 'number') {
            const volume = document.createElementNS(ns, 'rect'); const height = Math.max(1, (item.volume / maxVolume) * (volumeBottom - volumeTop));
            volume.setAttribute('x', String(x - candleWidth / 2)); volume.setAttribute('y', String(volumeBottom - height));
            volume.setAttribute('width', String(candleWidth)); volume.setAttribute('height', String(height)); volume.setAttribute('fill', color); volume.setAttribute('opacity', '.72'); svg.append(volume);
        }
    });
    for (let tick = 0; tick <= 4; tick++) {
        const value = high - ((high - low) * tick / 4); const y = yPrice(value);
        const grid = document.createElementNS(ns, 'line'); grid.setAttribute('x1', String(left)); grid.setAttribute('x2', String(right));
        grid.setAttribute('y1', String(y)); grid.setAttribute('y2', String(y)); grid.classList.add('market-history-grid'); svg.append(grid);
        const label = document.createElementNS(ns, 'text'); label.setAttribute('x', String(left - 6)); label.setAttribute('y', String(y + 3));
        label.setAttribute('text-anchor', 'end'); label.classList.add('market-history-axis-label');
        label.textContent = value.toLocaleString(undefined, { maximumFractionDigits: 1 }); svg.append(label);
    }
    const volumeLabel = document.createElementNS(ns, 'text'); volumeLabel.setAttribute('x', String(left)); volumeLabel.setAttribute('y', String(volumeTop - 5));
    volumeLabel.classList.add('market-history-axis-label');
    volumeLabel.textContent = marketI18n(volumeField === 'volume_contracts' ? 'marketHistoryVolumeContractsAxis' : 'marketHistoryVolumeSharesAxis', volumeField === 'volume_contracts' ? 'Volume (contracts)' : 'Volume (shares)');
    svg.append(volumeLabel);
    const separator = document.createElementNS(ns, 'line'); separator.setAttribute('x1', String(left)); separator.setAttribute('x2', String(right));
    separator.setAttribute('y1', '244'); separator.setAttribute('y2', '244'); separator.classList.add('market-history-zero'); svg.append(separator);
    const tickCount = Math.min(width < 480 ? 3 : 5, candles.length);
    for (let index = 0; index < tickCount; index++) {
        const pointIndex = Math.round(index * (candles.length - 1) / Math.max(tickCount - 1, 1)); const item = candles[pointIndex];
        if (!item) continue;
        const label = document.createElementNS(ns, 'text'); label.setAttribute('x', String(left + slot * (pointIndex + .5)));
        label.setAttribute('y', '330'); label.setAttribute('text-anchor', 'middle'); label.classList.add('market-history-axis-label');
        label.textContent = item.date.slice(5); svg.append(label);
    }
    const dateAxis = document.createElementNS(ns, 'text'); dateAxis.setAttribute('x', String((left + right) / 2)); dateAxis.setAttribute('y', '355');
    dateAxis.setAttribute('text-anchor', 'middle'); dateAxis.classList.add('market-history-axis-title');
    dateAxis.textContent = marketI18n('marketHistoryDate', 'Date'); svg.append(dateAxis);
    const priceAxis = document.createElementNS(ns, 'text'); priceAxis.setAttribute('x', '13'); priceAxis.setAttribute('y', String((priceTop + priceBottom) / 2));
    priceAxis.setAttribute('text-anchor', 'middle'); priceAxis.setAttribute('transform', `rotate(-90 13 ${(priceTop + priceBottom) / 2})`);
    priceAxis.classList.add('market-history-axis-title');
    priceAxis.textContent = marketI18n(volumeField === 'volume_contracts' ? 'marketHistoryPricePointsAxis' : 'marketHistoryPriceTwdAxis', volumeField === 'volume_contracts' ? 'Price (points)' : 'Price (TWD)');
    svg.append(priceAxis);
    const selection = document.createElementNS(ns, 'rect'); selection.setAttribute('y', String(priceTop));
    selection.setAttribute('height', String(volumeBottom - priceTop)); selection.setAttribute('fill', '#d8a43b');
    selection.setAttribute('opacity', '.16'); selection.setAttribute('pointer-events', 'none'); selection.hidden = true; svg.append(selection);
    const readout = document.createElement('div'); readout.className = 'market-chart-readout';
    readout.setAttribute('aria-live', 'polite');
    readout.textContent = marketI18n('marketHistoryChartGuide', 'Move over a candle for daily OHLC. Click to pin a date; drag to compare closing prices.');
    const nearestValidIndex = (index: number) => {
        let best = -1; let distance = Infinity;
        candles.forEach((item, candidate) => { if (item && Math.abs(candidate - index) < distance) { best = candidate; distance = Math.abs(candidate - index); } });
        return best;
    };
    const indexAt = (clientX: number) => {
        const rect = svg.getBoundingClientRect(); const viewX = ((clientX - rect.left) / rect.width) * width;
        return nearestValidIndex(Math.max(0, Math.min(candles.length - 1, Math.floor((viewX - left) / slot))));
    };
    const formatPrice = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 2 });
    const showCandle = (index: number) => {
        const item = candles[index]; if (!item) return;
        const volumeUnit = volumeField === 'volume_contracts' ? marketI18n('marketHistoryContracts', 'contracts') : marketI18n('marketHistorySharesUnit', 'shares');
        readout.textContent = `${item.date} · O ${formatPrice(item.open)} · H ${formatPrice(item.high)} · L ${formatPrice(item.low)} · C ${formatPrice(item.close)} · ${marketI18n('marketHistoryVolumeShort', 'Volume')} ${item.volume?.toLocaleString() ?? '—'} ${volumeUnit}`;
    };
    let dragStart = -1; let pinnedIndex = -1; let dragMoved = false; let dragStartX = 0;
    svg.style.touchAction = 'pan-y';
    svg.addEventListener('pointerdown', (event) => {
        if (event.button !== 0 && event.pointerType !== 'touch') return;
        dragStart = pinnedIndex >= 0 ? pinnedIndex : indexAt(event.clientX); dragStartX = event.clientX; dragMoved = false;
        if (dragStart >= 0) svg.setPointerCapture(event.pointerId);
    });
    svg.addEventListener('pointermove', (event) => {
        const index = indexAt(event.clientX); if (index < 0) return;
        if (dragStart >= 0 && svg.hasPointerCapture(event.pointerId)) {
            const endIndex = index; dragMoved ||= Math.abs(event.clientX - dragStartX) > 4;
            const x1 = left + slot * (Math.min(dragStart, endIndex) + .5);
            const x2 = left + slot * (Math.max(dragStart, endIndex) + .5);
            selection.setAttribute('x', String(x1)); selection.setAttribute('width', String(Math.max(slot, x2 - x1))); selection.hidden = false;
            const first = candles[dragStart]; const last = candles[endIndex];
            if (first && last) {
                const change = first.close ? (last.close - first.close) / first.close * 100 : 0;
                readout.textContent = `${first.date} ${formatPrice(first.close)} → ${last.date} ${formatPrice(last.close)} · ${marketI18n('marketHistoryRangeChange', 'Close change')} ${Number(change.toFixed(2)) > 0 ? '+' : ''}${change.toFixed(2)}%`;
            }
        } else showCandle(index);
    });
    const finishRange = (event: PointerEvent) => {
        if (dragStart < 0) return;
        dragStart = -1;
        const endIndex = indexAt(event.clientX);
        if (endIndex >= 0) pinnedIndex = endIndex;
        if (!dragMoved) {
            const index = endIndex;
            selection.setAttribute('x', String(left + slot * index)); selection.setAttribute('width', String(slot)); selection.hidden = false;
            showCandle(index);
        }
    };
    svg.addEventListener('pointerup', finishRange);
    svg.addEventListener('pointercancel', () => { dragStart = -1; selection.hidden = true; });
    target.append(svg);
    const legend = document.createElement('div'); legend.className = 'market-history-legend';
    legend.textContent = `${marketI18n('marketHistoryCandles', 'Daily OHLC')} · ${marketI18n(volumeField === 'volume_contracts' ? 'marketHistoryVolumeContractsAxis' : 'marketHistoryVolumeSharesAxis', volumeField === 'volume_contracts' ? 'Volume (contracts)' : 'Volume (shares)')}`;
    target.append(legend, readout);
}

let marketHistoryRetryTimer: number | null = null;
async function loadMarketHistory(instrument: DashboardInstrument, selectedTab = 'price', retries = 5) {
    if (marketHistoryRetryTimer !== null) { window.clearTimeout(marketHistoryRetryTimer); marketHistoryRetryTimer = null; }
    if (instrument.productType !== 'stock' && instrument.productType !== 'futures') return;
    const status = document.getElementById('market-history-status');
    // Overseas holdings never touch Taiwan sources (same digits can be a different company); they read the
    // IBKR/SEC data maya-sawa has persisted, so the panels work while the IB gateway is logged out.
    if (!isTaiwanInstrument(instrument)) {
        await loadOverseasPanel(instrument, selectedTab);
        return;
    }
    if (status) status.textContent = marketI18n('marketHistoryLoading', 'Loading history…');
    try {
        // Stock futures use their underlying stock. Index futures use the
        // official TAIFEX history stored under their futures code.
        const spotCode = instrument.productType === 'futures'
            ? (instrument.quote?.underlyingCode || instrument.underlyingCode || '') : instrument.code;
        const usesSpotHistory = instrument.productType === 'stock' || Boolean(spotCode);
        const historyCode = usesSpotHistory ? spotCode : instrument.code;
        const historyProductType = usesSpotHistory ? 'stock' : 'futures';
        if (selectedTab === 'fundamentals') {
            await loadMarketFundamentals(historyCode, historyProductType);
            return;
        }
        const view = selectedTab === 'ownership' && historyProductType === 'stock' ? 'ownership' : 'daily';
        const cacheKey = `${historyCode.toUpperCase()}:${view}`;
        const cached = marketHistoryCache.get(cacheKey);
        let payload = cached && Date.now() - cached.fetchedAt < MARKET_HISTORY_CACHE_TTL_MS
            ? cached.payload : undefined;
        if (!payload) {
            const query = view === 'ownership' ? '?view=ownership' : '';
            const response = await fetch(astroApiPath(`/api/market/dashboard/history/${encodeURIComponent(historyCode)}${query}`));
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            payload = await response.json() as MarketHistoryPayload;
            // Never cache an empty result: the backend starts a backfill for it and the next request should see the rows.
            if (payload.points?.length) marketHistoryCache.set(cacheKey, { payload, fetchedAt: Date.now() });
        }
        const historyLabel = instrument.productType === 'futures'
            ? `${historyCode} ${usesSpotHistory ? marketI18n('marketHistorySpotData', 'spot data') : marketI18n('marketHistoryFuturesData', 'TAIFEX futures data')} · ` : '';
        const points = payload.points ?? []; if (status) status.textContent = points.length
            ? `${historyLabel}${marketI18n('marketHistoryLoadedCount', '{count} daily records · {first} — {last}').replace('{count}', String(points.length)).replace('{first}', points[0].date).replace('{last}', points[points.length - 1].date)}`
            : `${historyLabel}${marketI18n('marketHistoryCollecting', 'Collecting history for this stock; the charts fill in automatically.')}`;
        if (!points.length && retries > 0) {
            marketHistoryRetryTimer = window.setTimeout(() => {
                const tab = document.querySelector<HTMLButtonElement>(`[data-market-tab="${selectedTab}"]`);
                if (selectedMarketInstrument === instrument && tab?.getAttribute('aria-selected') === 'true') void loadMarketHistory(instrument, selectedTab, retries - 1);
            }, 45_000);
        }
        const stockQuotes = ['twse:daily-price', 'tpex:daily-price']; const institutions = ['twse:institutional', 'tpex:institutional'];
        const priceSources = historyProductType === 'futures' ? ['taifex:daily-futures-price'] : stockQuotes;
        const institutionalSources = historyProductType === 'futures' ? ['taifex:futures-institutional'] : institutions;
        const margin = ['twse:margin-balance', 'tpex:margin-balance']; const borrowed = ['twse:borrow-short', 'tpex:borrow-short'];
        if (view === 'ownership') { renderOwnershipHistory(points); return; }
        drawMarketOHLCVolumeChart('market-history-price-chart', points, priceSources,
            historyProductType === 'futures' ? 'volume_contracts' : 'volume_shares');
        if (historyProductType === 'futures') {
            drawMarketHistoryChart('market-history-institutional-chart', points, [
                { label: marketI18n('marketHistoryForeignContractsNet', 'Foreign net (contracts)'), color: '#55b8a8', sourceKeys: institutionalSources, field: 'foreign_net_trade_contracts' },
                { label: marketI18n('marketHistoryTrustContractsNet', 'Trust net (contracts)'), color: '#7198df', sourceKeys: institutionalSources, field: 'trust_net_trade_contracts' },
                { label: marketI18n('marketHistoryDealerContractsNet', 'Dealer net (contracts)'), color: '#dc806f', sourceKeys: institutionalSources, field: 'dealer_net_trade_contracts' },
            ], { bars: true });
            const institutionalDescription = document.getElementById('market-history-institutional-description');
            if (institutionalDescription) institutionalDescription.textContent = marketI18n('marketHistoryTaifexAggregateDescription', 'TAIFEX participant totals for the futures product category; not contract-specific positions.');
            const notAvailable = marketI18n('marketHistorySpotDataUnavailable', 'This panel requires an underlying stock ticker and is unavailable for index futures.');
            for (const id of [
                'market-history-margin-chart', 'market-history-margin-flow-chart',
                'market-history-borrow-chart', 'market-history-borrow-flow-chart',
                'market-history-foreign-holding-chart',
                'market-history-foreign-limit-chart', 'market-history-ownership',
            ]) {
                const target = document.getElementById(id); if (target) target.textContent = notAvailable;
            }
            return;
        }
        drawMarketHistoryChart('market-history-institutional-chart', points, [
            { label: marketI18n('marketHistoryForeign', 'Foreign net'), color: '#55b8a8', sourceKeys: institutionalSources, field: 'foreign_net_shares' },
            { label: marketI18n('marketHistoryTrust', 'Trust net'), color: '#7198df', sourceKeys: institutionalSources, field: 'investment_trust_net_shares' },
        ], { bars: true });
        drawMarketHistoryChart('market-history-margin-chart', points, [
            { label: marketI18n('marketHistoryMarginBalance', 'Margin balance (lots)'), color: '#7198df', sourceKeys: margin, field: 'margin_balance_lots' },
            { label: marketI18n('marketHistoryShortBalance', 'Short balance (lots)'), color: '#dc806f', sourceKeys: margin, field: 'short_balance_lots' },
        ]);
        drawMarketHistoryChart('market-history-margin-flow-chart', points, [
            { label: marketI18n('marketHistoryMarginBuy', 'Margin buy (lots)'), color: '#55b8a8', sourceKeys: margin, field: 'margin_buy_lots' },
            { label: marketI18n('marketHistoryMarginSell', 'Margin sell (lots)'), color: '#dc806f', sourceKeys: margin, field: 'margin_sell_lots', negative: true },
            { label: marketI18n('marketHistoryShortSell', 'Short sell (lots)'), color: '#7198df', sourceKeys: margin, field: 'short_sell_lots', negative: true },
        ], { bars: true });
        drawMarketHistoryChart('market-history-borrow-chart', points, [
            { label: marketI18n('marketHistoryBorrowBalance', 'Borrowed stock sold balance (shares)'), color: '#55b8a8', sourceKeys: borrowed, field: 'borrow_short_balance_shares' },
        ]);
        drawMarketHistoryChart('market-history-borrow-flow-chart', points, [
            { label: marketI18n('marketHistoryBorrowSell', 'Borrowed stock sold (shares)'), color: '#7198df', sourceKeys: borrowed, field: 'borrow_short_sell_shares', negative: true },
            { label: marketI18n('marketHistoryReturned', 'Returned (shares)'), color: '#dc806f', sourceKeys: borrowed, field: 'borrow_short_return_shares' },
        ], { bars: true });
    } catch (error) { console.error('Market instrument history unavailable:', error); if (status) status.textContent = marketI18n('marketHistoryUnavailable', 'Historical data is temporarily unavailable.'); }
}

// Stale-while-revalidate: paint the last payload from localStorage immediately, then always fetch fresh.
const FUNDAMENTALS_STORAGE_PREFIX = 'market-fundamentals:v2:';
const FUNDAMENTALS_HISTORY_RETRY_MS = 45_000;
let fundamentalsRequestSeq = 0;
let fundamentalsRetryTimer: number | null = null;

function readStoredFundamentals(code: string): { payload: any; fetchedAt: number } | null {
    try { const raw = localStorage.getItem(FUNDAMENTALS_STORAGE_PREFIX + code); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function storeFundamentals(code: string, payload: any) {
    const { metrics, historyPending, source, staleSources, errors } = payload;
    try { localStorage.setItem(FUNDAMENTALS_STORAGE_PREFIX + code, JSON.stringify({ payload: { code, metrics, historyPending, source, staleSources, errors }, fetchedAt: Date.now() })); } catch { /* storage full or blocked */ }
}

const overseasResearchCache = new Map<string, { payload: OverseasResearch & Record<string, any>; fetchedAt: number }>();
async function fetchOverseasResearch(instrument: DashboardInstrument) {
    const key = `${instrument.code}:${instrument.market}`;
    const cached = overseasResearchCache.get(key);
    if (cached && Date.now() - cached.fetchedAt < 60_000) return cached.payload;
    const response = await fetch(astroApiPath(`/api/market/dashboard/overseas/${encodeURIComponent(instrument.code)}?market=${encodeURIComponent(instrument.market || '')}`));
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    overseasResearchCache.set(key, { payload, fetchedAt: Date.now() });
    return payload;
}

async function loadOverseasPanel(instrument: DashboardInstrument, selectedTab: string) {
    const fundamentals = selectedTab === 'fundamentals';
    const status = document.getElementById(fundamentals ? 'market-fundamentals-status' : 'market-history-status');
    if (fundamentalsRetryTimer !== null) { window.clearTimeout(fundamentalsRetryTimer); fundamentalsRetryTimer = null; }
    const seq = ++fundamentalsRequestSeq;
    if (status) status.textContent = marketI18n('marketHistoryLoading', 'Loading history…');
    let payload: OverseasResearch & Record<string, any>;
    try { payload = await fetchOverseasResearch(instrument); }
    catch (error) {
        console.error('Overseas research unavailable:', error);
        if (seq === fundamentalsRequestSeq && status) status.textContent = marketText('Stored overseas data is temporarily unavailable.', '本站保存的海外資料暫時無法讀取。');
        return;
    }
    if (seq !== fundamentalsRequestSeq || selectedMarketInstrument !== instrument) return;
    if (fundamentals) {
        const fetched = Date.parse(payload.datasets?.financials?.fetchedAt || '') || Date.now();
        renderMarketFundamentals(overseasFundamentalsPayload(payload), { fetchedAt: fetched, refreshing: false });
        return;
    }
    const points = overseasHistoryPoints(payload.daily);
    const technical = payload.technical || {};
    const profile = payload.datasets?.profile?.payload || {};
    // The collector keeps the last good data when IB is logged out; say when the latest attempt failed.
    const brokerDown = payload.coverage?.history_raw?.status && payload.coverage.history_raw.status !== 'ok';
    if (status) {
        const parts = [points.length
            ? marketI18n('marketHistoryLoadedCount', '{count} daily records · {first} — {last}').replace('{count}', String(points.length)).replace('{first}', points[0].date).replace('{last}', points[points.length - 1].date)
            : marketText('No IBKR daily bars stored yet; they fill in after the gateway is logged in.', '尚未保存 IB 日線；IB gateway 登入後會自動補上。'),
            'Interactive Brokers · ' + marketText('stored in this site', '本站資料庫')];
        if (brokerDown) parts.push(marketText('IB gateway offline: showing the last stored data', 'IB 未登入：顯示最後保存的資料'));
        if (profile.industry) parts.push(`${profile.industry}${profile.category ? ` / ${profile.category}` : ''}`);
        status.textContent = parts.join(' · ');
    }
    const chartId = 'market-history-price-chart';
    drawMarketOHLCVolumeChart(chartId, points, [OVERSEAS_PRICE_SOURCE], 'volume_shares');
    document.getElementById('market-overseas-kpis')?.remove();
    if (points.length) {
        const fmt = (value: unknown) => typeof value === 'number' ? formatNumber(value, 'price') : '—';
        const kpis = buildMarketKpis([
            { label: 'MA20 / MA60', value: `${fmt(technical.ma20)} / ${fmt(technical.ma60)}` },
            { label: 'RSI14', value: typeof technical.rsi14Wilder === 'number' ? formatNumber(technical.rsi14Wilder, 'decimal') : '—' },
            { label: marketText('5D / 20D change', '5 日 / 20 日漲跌'), value: `${formatSignedPercent(technical.change5dPercent, 1)} / ${formatSignedPercent(technical.change20dPercent, 1)}` },
            { label: marketText('Range in stored history', '保存期間高低'), value: `${fmt(technical.rangeLow)} – ${fmt(technical.rangeHigh)}` },
        ]);
        kpis.id = 'market-overseas-kpis';
        document.getElementById(chartId)?.before(kpis);
    }
}

async function loadMarketFundamentals(code: string, productType: string, retries = 4) {
    const status = document.getElementById('market-fundamentals-status');
    const boxes = ['market-fundamentals-revenue-chart', 'market-fundamentals-statements', 'market-fundamentals-balance', 'market-fundamentals-cash-flow']
        .map((id) => document.getElementById(id));
    const source = document.getElementById('market-fundamentals-source');
    if (fundamentalsRetryTimer !== null) { window.clearTimeout(fundamentalsRetryTimer); fundamentalsRetryTimer = null; }
    const seq = ++fundamentalsRequestSeq;
    if (productType !== 'stock' || !/^\d{4}$/.test(code)) {
        if (status) status.textContent = marketI18n('marketFundamentalsNoCompany', 'Company fundamentals are not available for index futures.');
        boxes.forEach((box) => box?.replaceChildren());
        if (source) source.textContent = '';
        return;
    }
    const stored = readStoredFundamentals(code);
    if (stored) renderMarketFundamentals(stored.payload, { fetchedAt: stored.fetchedAt, refreshing: true });
    else if (status) status.textContent = marketI18n('marketHistoryLoading', 'Loading history…');
    try {
        const response = await fetch(astroApiPath(`/api/market/dashboard/fundamentals/${encodeURIComponent(code)}`));
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json();
        if (seq !== fundamentalsRequestSeq) return; // another stock was selected meanwhile
        storeFundamentals(code, payload);
        renderMarketFundamentals(payload, { fetchedAt: Date.now(), refreshing: false });
        // History for a stock nobody opened before is collected in the background; check back shortly.
        if (payload.historyPending && retries > 0) {
            fundamentalsRetryTimer = window.setTimeout(() => {
                const panel = document.querySelector<HTMLElement>('[data-market-panel="fundamentals"]');
                if (seq === fundamentalsRequestSeq && panel && !panel.hidden) void loadMarketFundamentals(code, productType, retries - 1);
            }, FUNDAMENTALS_HISTORY_RETRY_MS);
        }
    } catch (error) {
        console.error('Market fundamentals unavailable:', error);
        if (seq !== fundamentalsRequestSeq) return;
        if (stored) renderMarketFundamentals(stored.payload, { fetchedAt: stored.fetchedAt, refreshing: false, failed: true });
        else if (status) status.textContent = marketI18n('marketHistoryUnavailable', 'Fundamentals are temporarily unavailable.');
    }
}

function renderMarketFundamentals(payload: any, state: { fetchedAt: number; refreshing: boolean; failed?: boolean }) {
    const metrics = payload.metrics ?? {};
    const pending = Boolean(payload.historyPending);
    const status = document.getElementById('market-fundamentals-status');
    if (status) {
        const time = new Date(state.fetchedAt).toLocaleString(marketLocale(), { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
        const parts = [`${payload.code} · ${marketI18n('marketFundamentalsUpdatedAt', 'updated')} ${time}`];
        if (state.refreshing) parts.push(marketI18n('marketFundamentalsRefreshing', 'refreshing…'));
        if (state.failed) parts.push(marketI18n('marketFundamentalsRefreshFailed', 'refresh failed; showing cached data'));
        if (pending) parts.push(marketI18n('marketFundamentalsHistoryPending', 'collecting history; this updates automatically'));
        status.textContent = parts.join(' · ');
    }
    const emptyText = pending ? marketI18n('marketFundamentalsHistoryPending', 'collecting history; this updates automatically') : marketI18n('marketFundamentalsNoRecords', 'No stored records are available for this statement.');
    renderRevenueGrowth(document.getElementById('market-fundamentals-revenue-chart'), metrics.monthly ?? [], emptyText);
    renderProfitability(document.getElementById('market-fundamentals-statements'), metrics.quarterly ?? [], emptyText);
    renderRatioTable(document.getElementById('market-fundamentals-balance'), metrics.balance ?? [], [
        { label: marketI18n('marketFundamentalsDebtRatio', 'Debt ratio'), key: 'debtRatio', kind: 'percent' },
        { label: `${marketI18n('marketFundamentalsDebtRatio', 'Debt ratio')} ${vsQuarter()}`, key: 'debtRatioQoQ', kind: 'pp' },
        { label: `${marketI18n('marketFundamentalsDebtRatio', 'Debt ratio')} ${vsYear()}`, key: 'debtRatioYoY', kind: 'pp' },
        { label: marketI18n('marketFundamentalsCurrentRatio', 'Current ratio'), key: 'currentRatio', kind: 'percent' },
        { label: `${marketI18n('marketFundamentalsCurrentRatio', 'Current ratio')} ${vsYear()}`, key: 'currentRatioYoY', kind: 'pp' },
        { label: `${marketI18n('marketFundamentalsEquity', 'Equity')} ${vsYear()}`, key: 'equityYoY', kind: 'growth' },
    ], emptyText);
    renderRatioTable(document.getElementById('market-fundamentals-cash-flow'), metrics.cashFlow ?? [], [
        { label: `${marketI18n('marketFundamentalsOperatingCashFlow', 'Operating cash flow')} ${vsYear()}`, key: 'ocfYoY', kind: 'growth' },
        { label: marketI18n('marketFundamentalsCashConversion', 'Operating cash flow ÷ pre-tax income'), key: 'cashConversion', kind: 'percent' },
        { label: `${marketI18n('marketFundamentalsCashConversionShort', 'Cash conversion')} ${vsYear()}`, key: 'cashConversionYoY', kind: 'pp' },
        { label: marketI18n('marketFundamentalsCapexToOcf', 'Capex ÷ operating cash flow'), key: 'capexToOcf', kind: 'percent' },
        { label: `${marketI18n('marketFundamentalsCapexShort', 'Capex share')} ${vsYear()}`, key: 'capexToOcfYoY', kind: 'pp' },
    ], emptyText, marketI18n('marketFundamentalsCashFlowNote', 'Cash flow statements are year-to-date, so changes compare with the same period last year.'));
    const source = document.getElementById('market-fundamentals-source');
    if (source) source.textContent = `${marketI18n('marketFundamentalsSource', 'Source')}: ${payload.source || '—'}${payload.errors?.length ? ` · ${payload.errors.join(' · ')}` : ''}`;
}

// Financial-statement tables: one decimal for margins and growth keeps dense tables readable (format/numbers.ts).
type RatioKind = 'percent' | 'growth' | 'pp';
const ratioFormat: Record<RatioKind, (value: number) => string> = {
    percent: (value) => formatNumber(value, 'percent', { digits: 1, locale: marketLocale() }),
    growth: (value) => formatSignedPercent(value, 1),
    pp: (value) => formatNumber(value, 'pp', { signed: true, locale: marketLocale() }),
};

function metricPoints(rows: any[], keys: string[]): MarketHistoryPoint[] {
    return rows.map((row) => {
        const values: MarketHistoryValues = {};
        for (const key of keys) if (typeof row[key] === 'number') values[key] = row[key];
        return { date: String(row.period), code: '', name: '', sources: { metrics: values } };
    });
}

function renderRevenueGrowth(target: HTMLElement | null, rows: any[], emptyText: string) {
    if (!target) return;
    target.replaceChildren();
    if (!rows.length) { target.textContent = emptyText; return; }
    const latest = rows[rows.length - 1];
    const recent = rows.slice(-3).map((row) => row.yoyPercent).filter((value): value is number => typeof value === 'number');
    const recentAverage = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : null;
    const chartId = `${target.id}-plot`; const chart = document.createElement('div'); chart.id = chartId;
    target.append(chart);
    drawMarketHistoryChart(chartId, metricPoints(rows, ['yoyPercent', 'momPercent']), [
        { label: marketI18n('marketFundamentalsYoY', 'YoY'), color: '#55b8a8', sourceKeys: ['metrics'], field: 'yoyPercent', tooltip: (_, v) => ratioFormat.growth(v) },
        { label: marketI18n('marketFundamentalsMoM', 'MoM'), color: '#7198df', sourceKeys: ['metrics'], field: 'momPercent', tooltip: (_, v) => ratioFormat.growth(v) },
    ], { height: 230, area: false, format: (v) => `${v}%` });
    target.prepend(buildMarketKpis([
        { label: `${marketI18n('marketFundamentalsYoY', 'YoY')} · ${latest.period}`, value: formatSignedPercent(latest.yoyPercent, 1) },
        { label: `${marketI18n('marketFundamentalsMoM', 'MoM')} · ${latest.period}`, value: formatSignedPercent(latest.momPercent, 1) },
        { label: marketI18n('marketFundamentalsYtdYoY', 'Year-to-date YoY'), value: formatSignedPercent(latest.ytdYoyPercent, 1) },
        { label: marketI18n('marketFundamentals3mYoY', '3-month average YoY'), value: formatSignedPercent(recentAverage, 1) },
    ]));
}

function renderProfitability(target: HTMLElement | null, rows: any[], emptyText: string) {
    if (!target) return;
    target.replaceChildren();
    if (!rows.length) { target.textContent = emptyText; return; }
    const latest = rows[rows.length - 1];
    const margin = (key: string, fallback: string) => ({
        label: `${marketI18n(key, fallback)} · ${latest.period}`,
        value: typeof latest[`${MARGIN_KEYS[key]}`] === 'number' ? ratioFormat.percent(latest[MARGIN_KEYS[key]]) : '—',
        sub: `${vsQuarter()} ${formatPp(latest[`${MARGIN_KEYS[key]}QoQ`])} · ${vsYear()} ${formatPp(latest[`${MARGIN_KEYS[key]}YoY`])}`,
    });
    target.append(buildMarketKpis([
        margin('marketFundamentalsGrossMargin', 'Gross margin'),
        margin('marketFundamentalsOperatingMargin', 'Operating margin'),
        margin('marketFundamentalsNetMargin', 'Net margin'),
        { label: `EPS ${vsYear()} · ${latest.period}`, value: formatSignedPercent(latest.epsYoY, 1), sub: `${vsQuarter()} ${formatSignedPercent(latest.epsQoQ, 1)}` },
    ]));
    const title = document.createElement('h6'); title.className = 'market-subheading';
    title.textContent = marketI18n('marketFundamentalsMarginTrend', 'Margin trend · single quarter');
    const chart = document.createElement('div'); chart.id = 'market-fundamentals-margin-chart';
    target.append(title, chart);
    drawMarketHistoryChart(chart.id, metricPoints(rows, ['grossMargin', 'operatingMargin', 'netMargin']), [
        { label: marketI18n('marketFundamentalsGrossMargin', 'Gross margin'), color: '#55b8a8', sourceKeys: ['metrics'], field: 'grossMargin', tooltip: (_, v) => ratioFormat.percent(v) },
        { label: marketI18n('marketFundamentalsOperatingMargin', 'Operating margin'), color: '#7198df', sourceKeys: ['metrics'], field: 'operatingMargin', tooltip: (_, v) => ratioFormat.percent(v) },
        { label: marketI18n('marketFundamentalsNetMargin', 'Net margin'), color: '#d5ae4b', sourceKeys: ['metrics'], field: 'netMargin', tooltip: (_, v) => ratioFormat.percent(v) },
    ], { height: 210, area: false, format: (v) => `${v}%` });
    const gross = marketI18n('marketFundamentalsGrossMargin', 'Gross margin');
    const operating = marketI18n('marketFundamentalsOperatingMargin', 'Operating margin');
    const net = marketI18n('marketFundamentalsNetMargin', 'Net margin');
    const revenue = marketI18n('marketFundamentalsRevenueLabel', 'Revenue');
    renderRatioTable(target, rows, [
        { label: `${revenue} ${vsQuarter()}`, key: 'revenueQoQ', kind: 'growth' },
        { label: `${revenue} ${vsYear()}`, key: 'revenueYoY', kind: 'growth' },
        { label: gross, key: 'grossMargin', kind: 'percent', group: true },
        { label: `${gross} ${vsQuarter()}`, key: 'grossMarginQoQ', kind: 'pp' },
        { label: `${gross} ${vsYear()}`, key: 'grossMarginYoY', kind: 'pp' },
        { label: operating, key: 'operatingMargin', kind: 'percent', group: true },
        { label: `${operating} ${vsQuarter()}`, key: 'operatingMarginQoQ', kind: 'pp' },
        { label: `${operating} ${vsYear()}`, key: 'operatingMarginYoY', kind: 'pp' },
        { label: net, key: 'netMargin', kind: 'percent', group: true },
        { label: `${net} ${vsQuarter()}`, key: 'netMarginQoQ', kind: 'pp' },
        { label: `${net} ${vsYear()}`, key: 'netMarginYoY', kind: 'pp' },
        { label: `EPS ${vsQuarter()}`, key: 'epsQoQ', kind: 'growth', group: true },
        { label: `EPS ${vsYear()}`, key: 'epsYoY', kind: 'growth' },
    ], emptyText, marketI18n('marketFundamentalsRatioNote', 'pp = percentage-point change in the margin. Growth rates are blank when the base period is zero or negative.'), false);
}

const MARGIN_KEYS: Record<string, string> = {
    marketFundamentalsGrossMargin: 'grossMargin', marketFundamentalsOperatingMargin: 'operatingMargin', marketFundamentalsNetMargin: 'netMargin',
};

function formatPp(value: unknown): string {
    return typeof value === 'number' && Number.isFinite(value) ? ratioFormat.pp(value) : '—';
}

function formatSignedPercent(value: unknown, digits = 2): string {
    return formatNumber(typeof value === 'number' || typeof value === 'string' ? value : null, 'percent', { signed: true, digits, locale: marketLocale() });
}

// Taiwan market convention: red rises, green falls (matches the candle colors).
function deltaClass(value: unknown): string {
    const number = Number(value);
    return value === null || value === undefined || !Number.isFinite(number) || number === 0 ? '' : number > 0 ? 'market-delta--up' : 'market-delta--down';
}

// Colours each signed number by what is actually displayed ("+0.0%" after rounding is neutral), so a text
// holding two changes — e.g. "QoQ +1.47 pp · YoY -0.30 pp" — gets one colour per number, not per element.
function appendSignedText(target: HTMLElement, text: string) {
    const pattern = /(^|\s)([+-]\d[\d,]*(?:\.\d+)?)/g;
    let cursor = 0;
    for (const match of text.matchAll(pattern)) {
        const start = (match.index ?? 0) + match[1].length;
        target.append(text.slice(cursor, start));
        const span = document.createElement('span'); span.textContent = match[2];
        const cls = deltaClass(Number(match[2].replace(/,/g, ''))); if (cls) span.className = cls;
        target.append(span); cursor = start + match[2].length;
    }
    target.append(text.slice(cursor));
}

function buildMarketKpis(items: { label: string; value: string; sub?: string }[]): HTMLElement {
    const row = document.createElement('div'); row.className = 'market-kpi-row';
    for (const item of items) {
        const tile = document.createElement('div'); tile.className = 'market-kpi';
        const label = document.createElement('span'); label.textContent = item.label;
        const value = document.createElement('strong'); appendSignedText(value, item.value);
        tile.append(label, value);
        if (item.sub) { const sub = document.createElement('small'); appendSignedText(sub, item.sub); tile.append(sub); }
        row.append(tile);
    }
    return row;
}

interface RatioRow { label: string; key: string; kind: RatioKind; group?: boolean }
function renderRatioTable(target: HTMLElement | null, rows: any[], spec: RatioRow[], emptyText: string, note?: string, clear = true) {
    if (!target) return;
    if (clear) target.replaceChildren();
    if (!rows.length) { target.textContent = emptyText; return; }
    const wrap = document.createElement('div'); wrap.className = 'market-fin-table-wrap';
    const table = document.createElement('table'); table.className = 'market-fin-table';
    const head = document.createElement('tr');
    const corner = document.createElement('th'); corner.scope = 'col'; corner.textContent = marketI18n('marketFundamentalsItem', 'Item'); head.append(corner);
    rows.forEach((row, i) => { const th = document.createElement('th'); th.scope = 'col'; th.textContent = String(row.period); if (i === rows.length - 1) th.className = 'is-latest'; head.append(th); });
    const thead = document.createElement('thead'); thead.append(head);
    const tbody = document.createElement('tbody');
    for (const line of spec) {
        const tr = document.createElement('tr'); if (line.group) tr.className = 'is-group';
        const th = document.createElement('th'); th.scope = 'row'; th.textContent = line.label; tr.append(th);
        rows.forEach((row, i) => {
            const value = row[line.key]; const td = document.createElement('td');
            const text = typeof value === 'number' && Number.isFinite(value) ? ratioFormat[line.kind](value) : '—';
            if (line.kind === 'percent') td.textContent = text; else appendSignedText(td, text);
            if (i === rows.length - 1) td.classList.add('is-latest');
            tr.append(td);
        });
        tbody.append(tr);
    }
    table.append(thead, tbody); wrap.append(table); target.append(wrap);
    // Newest period sits on the right; start scrolled there on narrow screens.
    requestAnimationFrame(() => { wrap.scrollLeft = wrap.scrollWidth; });
    if (note) { const small = document.createElement('p'); small.className = 'market-fin-note'; small.textContent = note; target.append(small); }
}

function renderOwnershipHistory(points: MarketHistoryPoint[]) {
    const holdingSources = ['twse:foreign-holding', 'tpex:foreign-holding'];
    // Holding % gets its own zoomed scale; the legal limit is a near-constant 100%, so it is shown as headroom
    // in the tiles instead of as a second line that would flatten the holding series.
    // Shares = % × shares outstanding, so they trace the same curve: one chart, both values in the readout
    // (AGENTS.md: one chart per shape).
    drawMarketHistoryChart('market-history-foreign-holding-chart', points, [
        { label: marketI18n('marketHistoryForeignHoldingPercent', 'Foreign holding (%)'), color: '#55b8a8', sourceKeys: holdingSources, field: 'foreign_holding_percent', tooltip: (point, value) => {
            const shares = historyValue(point, holdingSources, 'foreign_holding_shares');
            return `${value}%${shares === null ? '' : ` · ${compactNumber(shares, 2)} ${marketI18n('marketHistorySharesUnit', 'shares')}`}`;
        } },
    ], { height: 220, format: (v) => `${v}%` });
    const holding = points.map((point) => historyValue(point, holdingSources, 'foreign_holding_percent')).filter((v): v is number => v !== null);
    const limits = points.map((point) => historyValue(point, holdingSources, 'foreign_limit_percent')).filter((v): v is number => v !== null);
    const chart = document.getElementById('market-history-foreign-holding-chart');
    if (chart && holding.length) {
        const latest = holding[holding.length - 1]; const limit = limits[limits.length - 1];
        const change = latest - holding[0];
        chart.prepend(buildMarketKpis([
            { label: marketI18n('marketHistoryForeignHoldingPercent', 'Foreign holding (%)'), value: formatNumber(latest, 'percent') },
            { label: `${marketI18n('marketHistoryChangeSince', 'Change since')} ${points[0].date.slice(5)}`, value: formatPp(change) },
            { label: marketI18n('marketHistoryForeignHeadroom', 'Headroom to legal limit'), value: limit !== undefined ? formatNumber(limit - latest, 'pp') : '—', sub: limit !== undefined ? `${marketI18n('marketHistoryForeignLimit', 'Legal investment limit (%)')} ${limit}%` : undefined },
        ]));
    }
    renderTdccOwnership(points);
}

function renderTdccOwnership(points: MarketHistoryPoint[]) {
    const target = document.getElementById('market-history-ownership'); if (!target) return; target.replaceChildren();
    const snapshots = points.map((point) => ({ point, tiers: point.sources['tdcc:distribution-history']?.tiers as unknown as any[] | undefined }))
        .filter((entry): entry is { point: MarketHistoryPoint; tiers: any[] } => Array.isArray(entry.tiers) && entry.tiers.length > 0)
        .map((entry) => ({ ...entry, buckets: tdccBuckets(entry.tiers) }));
    if (!snapshots.length) { target.textContent = marketI18n('marketHistoryCollecting', 'Collecting history for this stock; the charts fill in automatically.'); return; }
    const first = snapshots[0]; const latest = snapshots[snapshots.length - 1];
    const label = (bucket: typeof TDCC_BUCKETS[number]) => marketI18n(bucket.key, bucket.fallback);

    // Latest composition as one 100% bar, so it is visible at a glance that no tier is left out.
    const bar = document.createElement('div'); bar.className = 'market-tier-stack'; bar.setAttribute('role', 'img');
    bar.setAttribute('aria-label', TDCC_BUCKETS.map((bucket, i) => `${label(bucket)} ${latest.buckets[i].percent}%`).join(', '));
    TDCC_BUCKETS.forEach((bucket, i) => {
        const segment = document.createElement('span'); segment.style.flexGrow = String(Math.max(latest.buckets[i].percent, 0.0001));
        segment.style.background = bucket.color; segment.title = `${label(bucket)} · ${latest.buckets[i].percent}%`; bar.append(segment);
    });
    const legend = document.createElement('div'); legend.className = 'market-history-legend';
    TDCC_BUCKETS.forEach((bucket, i) => { const item = document.createElement('span'); const dot = document.createElement('i'); dot.style.background = bucket.color; item.append(dot, document.createTextNode(`${label(bucket)} ${latest.buckets[i].percent.toFixed(2)}%`)); legend.append(item); });
    target.append(bar, legend);

    const grid = document.createElement('div'); grid.className = 'market-tier-grid'; target.append(grid);
    TDCC_BUCKETS.forEach((bucket, index) => {
        const now = latest.buckets[index]; const then = first.buckets[index];
        const card = document.createElement('article'); card.className = 'market-tier-card'; card.style.setProperty('--tier-color', bucket.color);
        const header = document.createElement('header');
        const name = document.createElement('span'); name.className = 'market-tier-name'; name.textContent = label(bucket);
        const value = document.createElement('strong'); value.textContent = formatNumber(now.percent, 'percent');
        const change = document.createElement('small');
        if (snapshots.length > 1) appendSignedText(change, `${formatPp(now.percent - then.percent)} · ${marketI18n('marketHistorySinceFirstWeek', 'since')} ${first.point.date.slice(5)}`);
        const holders = document.createElement('small'); holders.className = 'market-tier-holders';
        const holderChange = now.holders - then.holders;
        appendSignedText(holders, `${now.holders.toLocaleString(marketLocale())} ${marketI18n('marketHistoryHolders', 'holders')}${snapshots.length > 1 ? ` (${holderChange > 0 ? '+' : ''}${holderChange.toLocaleString(marketLocale())})` : ''}`);
        header.append(name, value, change, holders);
        card.append(header); grid.append(card);
    });
    // One chart for all four buckets (AGENTS.md: one chart per shape). Levels differ by ~80 pp, so the lines plot
    // each bucket's change since the first week on a shared axis; the readout keeps the level, shares and holders.
    const chartNote = document.createElement('p'); chartNote.className = 'market-updated';
    chartNote.textContent = marketText(`Change in each group's share since ${first.point.date} (pp)`, `各組持股比例較 ${first.point.date} 的變化（pp）`);
    const chart = document.createElement('div'); chart.id = 'market-history-tdcc-chart'; target.append(chartNote, chart);
    const changes = tdccChangeSeries(snapshots.map((snapshot) => snapshot.buckets));
    const chartPoints: MarketHistoryPoint[] = snapshots.map(({ point }, row) => ({ ...point, sources: { 'tdcc:bucket':
        Object.fromEntries(changes[row].map((change, index) => [`change${index}`, change])) } }));
    drawMarketHistoryChart(chart.id, chartPoints, TDCC_BUCKETS.map((bucket, index) => ({
        label: label(bucket), color: bucket.color, sourceKeys: ['tdcc:bucket'], field: `change${index}`,
        tooltip: (point: MarketHistoryPoint, change: number) => {
            const row = snapshots.find((snapshot) => snapshot.point.date === point.date)?.buckets[index];
            return row ? `${formatNumber(row.percent, 'percent')} (${formatPp(change)}) · ${compactNumber(row.shares, 2)} ${marketI18n('marketHistorySharesUnit', 'shares')} · ${formatNumber(row.holders, 'count', { locale: marketLocale() })} ${marketI18n('marketHistoryHolders', 'holders')}` : '—';
        },
    })), { height: 240, area: false, legend: false, format: (v) => `${v} pp` });
    const latestNote = document.createElement('p'); latestNote.className = 'market-updated market-history-tdcc-latest';
    latestNote.textContent = `${marketI18n('marketHistoryLatestSnapshot', 'Latest snapshot')}: ${snapshots[snapshots.length - 1].point.date}`;
    target.append(latestNote);
}

function selectMarketDetailTab(tabName: string) {
    document.querySelectorAll<HTMLButtonElement>('[data-market-tab]').forEach((tab) => tab.setAttribute('aria-selected', String(tab.dataset.marketTab === tabName)));
    document.querySelectorAll<HTMLElement>('[data-market-panel]').forEach((panel) => { panel.hidden = panel.dataset.marketPanel !== tabName; });
    if (selectedMarketInstrument) {
        if (tabName === 'ai-analysis') void loadMarketAiAnalysis(selectedMarketInstrument);
        else if (tabName === 'research') void loadMarketResearch(selectedMarketInstrument);
        else void loadMarketHistory(selectedMarketInstrument, tabName);
    }
}

// Mermaid from the same pinned CDN build as the About page; strict security keeps labels as text and drops links.
let mermaidScript: Promise<any> | null = null;
function loadMermaidLibrary() {
    mermaidScript ??= new Promise((resolve, reject) => {
        if ((window as any).mermaid) return resolve((window as any).mermaid);
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js';
        script.onload = () => resolve((window as any).mermaid);
        script.onerror = () => { mermaidScript = null; reject(new Error('Mermaid unavailable')); };
        document.head.append(script);
    });
    return mermaidScript;
}

async function renderResearchDiagrams(nodes: HTMLElement[]) {
    try {
        const mermaid = await loadMermaidLibrary();
        mermaid.initialize({ ...getMermaidConfig(document.documentElement.classList.contains('theme-dark')), startOnLoad: false, securityLevel: 'strict' });
        await mermaid.run({ nodes });
    } catch (error) {
        console.error('Research diagram rendering failed:', error);
        nodes.forEach((node) => node.classList.add('market-research-diagram--source'));
    }
}

let marketResearchSequence = 0;
async function loadMarketResearch(instrument: DashboardInstrument) {
    const status = document.getElementById('market-research-status');
    const target = document.getElementById('market-research-content');
    if (!status || !target) return;
    const code = researchRecordCode({ ...instrument, underlyingCode: marketUnderlyingCode(instrument) || null });
    const sequence = ++marketResearchSequence;
    status.textContent = marketText('Loading research…', '正在載入研究…');
    target.replaceChildren();
    let payload: { analysis: MarketAiComment | null; history: MarketAiComment[] };
    try {
        const response = await fetch(astroApiPath(`/api/market/dashboard/analysis/${encodeURIComponent(code)}?productType=research`), { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        payload = await response.json();
    } catch (error) {
        console.error('Research unavailable:', error);
        if (sequence === marketResearchSequence) status.textContent = marketText('Research is temporarily unavailable.', '研究資料暫時無法讀取。');
        return;
    }
    if (sequence !== marketResearchSequence) return;
    const saved = payload.analysis;
    const record = saved ? parseResearchRecord(saved.content) : null;
    if (!saved || !record) {
        status.textContent = marketText(`No research map saved for ${code} yet.`, `${code} 尚未保存研究（productType=research）。`);
        return;
    }
    status.textContent = `${code} · ${marketText('revision', '版本')} ${saved.revision} · ${saved.model} · ${new Date(saved.updatedAt).toLocaleString()} · ${marketText('as of', '資料截點')} ${record.asOf}`;
    const el = (tag: string, className: string, text?: string) => { const node = document.createElement(tag); node.className = className; if (text !== undefined) node.textContent = text; return node; };
    const head = el('div', 'market-research-head');
    head.append(el('strong', '', record.name), el('span', `market-research-lean market-research-tone--${researchLeanTone(record.lean)}`, `${marketText('Lean', '偏向')}：${record.lean}`));
    const grid = el('div', 'market-research-dimensions');
    for (const dimension of RESEARCH_DIMENSIONS) {
        const item = record.assessment[dimension.key];
        const card = el('article', 'market-research-dimension');
        card.append(el('span', '', marketText(dimension.label.en, dimension.label.zh)),
            el('strong', `market-research-tone--${researchViewTone(item.view)}`, item.view), el('p', '', item.note));
        grid.append(card);
    }
    const diagrams: HTMLElement[] = [];
    const diagram = (title: string, source: string) => {
        const section = el('section', 'market-research-diagram');
        const pre = el('pre', 'mermaid', source);
        diagrams.push(pre);
        section.append(el('h5', '', title), pre);
        return section;
    };
    target.append(head, el('p', 'market-research-summary', record.summary), grid,
        el('p', 'market-research-reason', record.leanReason),
        diagram(marketText('Supply chain', '供應鏈環節'), record.supplyChain),
        diagram(marketText('Technology roadmap', '技術環節與量產狀態'), record.technology));
    if (record.watch.length) {
        const list = el('ul', 'market-research-watch');
        record.watch.forEach((item) => list.append(el('li', '', item)));
        target.append(el('h5', '', marketText('Watch next', '接下來觀察')), list);
    }
    if (record.sources.length) {
        const links = el('p', 'market-updated');
        record.sources.forEach((source, index) => {
            const link = document.createElement('a'); link.href = source.url; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = source.label;
            links.append(...(index ? [document.createTextNode(' · '), link] : [link]));
        });
        target.append(links);
    }
    if (record.basis) target.append(el('p', 'market-updated', record.basis));
    await renderResearchDiagrams(diagrams);
}

interface MarketAiComment { code: string; productType: string; model: string; content: string; revision: number; updatedAt: string }
const marketAiDrafts = new Map<string, { model: string; content: string; revision: number }>();
let marketAiLoadSequence = 0;

async function loadLiveResearchContext(instrument: DashboardInstrument, sequence: number) {
    const target = document.getElementById('market-ai-live-context');
    if (!target) return;
    target.textContent = marketText('Checking current data…', '正在檢查本次資料…');
    const paths = ['/api/market/dashboard/brief', '/api/market/dashboard/macro', '/api/market/dashboard/events'];
    if (!isTaiwanInstrument(instrument)) paths.push(`/api/market/dashboard/overseas/${encodeURIComponent(instrument.code)}?market=${encodeURIComponent(instrument.market || '')}`);
    const results = await Promise.allSettled(paths.map(async (path) => {
        const response = await fetch(astroApiPath(path), { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
    }));
    if (sequence !== marketAiLoadSequence) return;
    const values = results.map((result) => result.status === 'fulfilled' ? result.value : null);
    const context = buildResearchContext(instrument, values[0], values[1], values[2], new Date().toISOString(), values[3]);
    target.textContent = JSON.stringify({ ...context,
        unavailableEndpoints: paths.filter((_, i) => results[i].status === 'rejected') }, null, 2);
}

async function loadRowAnalysisBadge(target: HTMLElement, instrument: DashboardInstrument) {
    const code = marketUnderlyingCode(instrument) || analysisRecordCode(instrument);
    const kind = marketUnderlyingCode(instrument) ? 'stock' : instrument.productType;
    try {
        const response = await fetch(astroApiPath(`/api/market/dashboard/analysis/${encodeURIComponent(code)}?productType=${kind}`), { cache: 'no-store' });
        if (!response.ok) throw new Error('Analysis unavailable');
        const payload = await response.json();
        const badge = payload.analysis ? buildAnalysisRatingBadge(payload.analysis.content) : null;
        if (badge) target.replaceChildren(badge);
        else target.textContent = payload.analysis ? marketText('No rating', '未標結論') : marketText('Analysis missing', '待分析');
    } catch { target.textContent = marketText('Analysis unavailable', '分析暫不可讀'); }
}

// Colored 買／中立／賣 badge from an analysis' conclusion line (Taiwan convention: red buy, green sell).
function buildAnalysisRatingBadge(content: string): HTMLElement | null {
    const rating = analysisRating(content);
    if (!rating) return null;
    const badge = document.createElement('span');
    badge.className = `market-ai-rating market-ai-rating--${rating}`;
    badge.textContent = rating === 'buy' ? marketText('Buy', '買') : rating === 'sell' ? marketText('Sell', '賣') : marketText('Neutral', '中立');
    return badge;
}

function renderMarketAiTable(targetId: string, rows: MarketAiComment[]) {
    const target = document.getElementById(targetId); if (!target) return;
    target.replaceChildren();
    if (!rows.length) { target.textContent = marketI18n('marketAiEmpty', 'No saved analysis yet.'); return; }
    const wrap = document.createElement('div'); wrap.className = 'market-fin-table-wrap';
    const table = document.createElement('table'); table.className = 'market-fin-table market-ai-table';
    const head = table.createTHead().insertRow();
    for (const label of [marketI18n('marketAiRevision', 'Revision'), marketI18n('marketAiTime', 'Updated'), marketI18n('marketAiModel', 'AI / model'), marketText('Conclusion', '結論'), marketI18n('marketAiComment', 'Commentary')]) {
        const th = document.createElement('th'); th.scope = 'col'; th.textContent = label; head.append(th);
    }
    const body = table.createTBody();
    for (const row of rows) {
        const tr = body.insertRow();
        for (const value of [String(row.revision), new Date(row.updatedAt).toLocaleString(marketLocale()), row.model]) {
            const td = tr.insertCell(); td.textContent = value;
        }
        const rating = tr.insertCell(); const badge = buildAnalysisRatingBadge(row.content);
        if (badge) rating.append(badge); else rating.textContent = '—';
        const content = tr.insertCell(); content.textContent = row.content;
    }
    wrap.append(table); target.append(wrap);
}

async function loadMarketAiAnalysis(instrument: DashboardInstrument) {
    const form = document.getElementById('market-ai-form') as HTMLFormElement | null;
    const fields = document.getElementById('market-ai-fields') as HTMLFieldSetElement | null;
    const status = document.getElementById('market-ai-status');
    if (!form || !fields || !status) return;
    const code = marketUnderlyingCode(instrument) || analysisRecordCode(instrument);
    const kind = marketUnderlyingCode(instrument) ? 'stock' : instrument.productType;
    const key = `${kind}:${code}`; const sequence = ++marketAiLoadSequence;
    void loadLiveResearchContext(instrument, sequence);
    const endpoint = astroApiPath(`/api/market/dashboard/analysis/${encodeURIComponent(code)}?productType=${kind}`);
    form.dataset.key = key; form.dataset.endpoint = endpoint; form.dataset.loaded = 'false'; fields.disabled = true;
    const model = document.getElementById('market-ai-model') as HTMLInputElement;
    const content = document.getElementById('market-ai-content') as HTMLTextAreaElement;
    const revision = document.getElementById('market-ai-revision') as HTMLInputElement;
    const save = document.getElementById('market-ai-save') as HTMLButtonElement;
    const draft = marketAiDrafts.get(key);
    model.value = draft?.model ?? ''; content.value = draft?.content ?? ''; revision.value = String(draft?.revision ?? 0);
    document.getElementById('market-ai-target')!.textContent = `${code} · ${kind}`;
    document.getElementById('market-ai-endpoint')!.textContent = new URL(endpoint, location.origin).href;
    document.getElementById('market-ai-current')!.replaceChildren();
    document.getElementById('market-ai-history')!.replaceChildren();
    status.textContent = marketI18n('marketAiLoading', 'Loading saved analysis…');
    try {
        const response = await fetch(endpoint, { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json() as { analysis: MarketAiComment | null; history: MarketAiComment[] };
        if (sequence !== marketAiLoadSequence || form.dataset.key !== key) return;
        renderMarketAiTable('market-ai-current', payload.analysis ? [payload.analysis] : []);
        renderMarketAiTable('market-ai-history', payload.history.filter((row) => row.revision !== payload.analysis?.revision));
        const targetLabel = document.getElementById('market-ai-target')!;
        targetLabel.textContent = `${code} · ${kind}`;
        const headerBadge = payload.analysis ? buildAnalysisRatingBadge(payload.analysis.content) : null;
        if (headerBadge) targetLabel.append(' ', headerBadge);
        model.value = draft?.model ?? payload.analysis?.model ?? '';
        content.value = draft?.content ?? payload.analysis?.content ?? '';
        revision.value = String(draft?.revision ?? payload.analysis?.revision ?? 0);
        form.dataset.loaded = 'true'; save.disabled = false;
        document.getElementById('market-ai-api-example')!.textContent = JSON.stringify({ model: 'Your AI/model name', content: 'Your updated analysis', expectedRevision: payload.analysis?.revision ?? 0 }, null, 2);
        status.textContent = payload.analysis
            ? marketI18n('marketAiSavedStatus', 'Saved · revision {revision}').replace('{revision}', String(payload.analysis.revision))
            : marketI18n('marketAiEmpty', 'No saved analysis yet.');
    } catch {
        if (sequence !== marketAiLoadSequence || form.dataset.key !== key) return;
        save.disabled = true; status.textContent = marketI18n('marketAiLoadError', 'Analysis could not be loaded. Reload before editing.');
    } finally { if (sequence === marketAiLoadSequence) fields.disabled = false; }
}

// Shared macro commentary: one record that every instrument analysis cites instead of restating macro data.
const MACRO_COMMENTARY_ENDPOINT = () => astroApiPath('/api/market/dashboard/analysis/US?productType=macro');
let macroCommentaryDraft: { model: string; content: string; revision: number } | null = null;

async function loadMacroCommentary() {
    const body = document.getElementById('macro-commentary-body');
    const meta = document.getElementById('macro-commentary-meta');
    const fields = document.getElementById('macro-ai-fields') as HTMLFieldSetElement | null;
    const status = document.getElementById('macro-ai-status');
    const form = document.getElementById('macro-ai-form') as HTMLFormElement | null;
    if (!body || !meta || !fields || !status || !form) return;
    const endpoint = MACRO_COMMENTARY_ENDPOINT();
    document.getElementById('macro-ai-endpoint')!.textContent = new URL(endpoint, location.origin).href;
    form.dataset.loaded = 'false'; fields.disabled = true;
    try {
        const response = await fetch(endpoint, { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json() as { analysis: MarketAiComment | null; history: MarketAiComment[] };
        const current = payload.analysis;
        body.replaceChildren();
        const text = document.createElement('p'); text.className = 'macro-commentary-text';
        text.textContent = current?.content || marketText('No shared macro commentary yet.', '尚未建立總經評論。');
        body.append(text);
        meta.textContent = current
            ? `${marketText('Revision', '版本')} ${current.revision} · ${current.model} · ${new Date(current.updatedAt).toLocaleString(marketLocale())}`
            : '';
        renderMarketAiTable('macro-ai-history', payload.history.filter((row) => row.revision !== current?.revision));
        (document.getElementById('macro-ai-model') as HTMLInputElement).value = macroCommentaryDraft?.model ?? current?.model ?? '';
        (document.getElementById('macro-ai-content') as HTMLTextAreaElement).value = macroCommentaryDraft?.content ?? current?.content ?? '';
        (document.getElementById('macro-ai-revision') as HTMLInputElement).value = String(macroCommentaryDraft?.revision ?? current?.revision ?? 0);
        form.dataset.loaded = 'true';
        status.textContent = current
            ? marketI18n('marketAiSavedStatus', 'Saved · revision {revision}').replace('{revision}', String(current.revision))
            : marketI18n('marketAiEmpty', 'No saved analysis yet.');
    } catch {
        body.replaceChildren();
        const error = document.createElement('p'); error.className = 'market-updated';
        error.textContent = marketText('Macro commentary could not be loaded.', '總經評論載入失敗。');
        body.append(error);
        status.textContent = marketI18n('marketAiLoadError', 'Analysis could not be loaded. Reload before editing.');
    } finally { fields.disabled = false; }
}

function initMacroCommentary() {
    const form = document.getElementById('macro-ai-form') as HTMLFormElement | null;
    if (!form || form.dataset.bound) return;
    form.dataset.bound = 'true';
    const status = () => document.getElementById('macro-ai-status')!;
    const draft = () => ({ model: (document.getElementById('macro-ai-model') as HTMLInputElement).value,
        content: (document.getElementById('macro-ai-content') as HTMLTextAreaElement).value,
        revision: Number((document.getElementById('macro-ai-revision') as HTMLInputElement).value) });
    document.getElementById('macro-ai-copy-prompt')?.addEventListener('click', async () => {
        const prompt = document.getElementById('macro-ai-prompt-text')?.textContent?.trim();
        if (!prompt) return;
        try {
            await navigator.clipboard.writeText(prompt);
            status().textContent = marketI18n('marketAiPromptCopied', '研究提示已複製。');
        } catch {
            status().textContent = marketI18n('marketAiPromptCopyFailed', '無法存取剪貼簿，請選取提示文字後複製。');
        }
    });
    form.addEventListener('input', () => { if (form.dataset.loaded === 'true') macroCommentaryDraft = draft(); });
    document.getElementById('macro-ai-reload')?.addEventListener('click', () => { macroCommentaryDraft = null; void loadMacroCommentary(); });
    form.addEventListener('submit', async (event) => {
        event.preventDefault(); if (form.dataset.loaded !== 'true') return;
        const value = draft(); macroCommentaryDraft = value;
        if (!hasMarketAuth()) { status().textContent = marketI18n('marketAiSignIn', 'Sign in before saving.'); return; }
        const fields = document.getElementById('macro-ai-fields') as HTMLFieldSetElement;
        fields.disabled = true; status().textContent = marketI18n('marketAiSaving', 'Saving analysis…');
        try {
            const response = await fetch(MACRO_COMMENTARY_ENDPOINT(), { method: 'PUT', headers: { ...marketAuthHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: value.model, content: value.content, expectedRevision: value.revision }) });
            if (!response.ok) {
                throw new Error(response.status === 409 ? 'marketAiConflict' : response.status === 401 || response.status === 403 ? 'marketAiSignIn' : 'marketAiSaveError');
            }
            const payload = await response.json() as { analysis: MarketAiComment; saved: boolean };
            if (!payload.saved || !payload.analysis?.revision) throw new Error('marketAiSaveError');
            macroCommentaryDraft = null;
            await loadMacroCommentary();
        } catch (error) {
            status().textContent = marketI18n(error instanceof Error ? error.message : 'marketAiSaveError', marketI18n('marketAiSaveError', 'Save failed; your draft is preserved.'));
        } finally { fields.disabled = false; }
    });
}

function initMarketAiAnalysis() {
    const form = document.getElementById('market-ai-form') as HTMLFormElement | null;
    if (!form || form.dataset.bound) return;
    form.dataset.bound = 'true';
    document.getElementById('market-ai-copy-prompt')?.addEventListener('click', async () => {
        const prompt = [document.getElementById('market-ai-research-prompt-text')?.textContent?.trim(),
            document.getElementById('market-ai-live-context')?.textContent?.trim()].filter(Boolean).join('\n\n');
        const status = document.getElementById('market-ai-status');
        if (!prompt || !status) return;
        try {
            await navigator.clipboard.writeText(prompt);
            status.textContent = marketI18n('marketAiPromptCopied', '研究提示已複製。');
        } catch {
            status.textContent = marketI18n('marketAiPromptCopyFailed', '無法存取剪貼簿，請選取提示文字後複製。');
        }
    });
    const draft = () => ({ model: (document.getElementById('market-ai-model') as HTMLInputElement).value,
        content: (document.getElementById('market-ai-content') as HTMLTextAreaElement).value,
        revision: Number((document.getElementById('market-ai-revision') as HTMLInputElement).value) });
    form.addEventListener('input', () => { if (form.dataset.key && form.dataset.loaded === 'true') marketAiDrafts.set(form.dataset.key, draft()); });
    document.getElementById('market-ai-reload')?.addEventListener('click', () => {
        if (form.dataset.key) marketAiDrafts.delete(form.dataset.key);
        if (selectedMarketInstrument) void loadMarketAiAnalysis(selectedMarketInstrument);
    });
    form.addEventListener('submit', async (event) => {
        event.preventDefault(); if (form.dataset.loaded !== 'true' || !form.dataset.key) return;
        const key = form.dataset.key; const endpoint = form.dataset.endpoint!; const value = draft();
        const status = document.getElementById('market-ai-status')!;
        const fields = document.getElementById('market-ai-fields') as HTMLFieldSetElement;
        marketAiDrafts.set(key, value);
        if (!hasMarketAuth()) { status.textContent = marketI18n('marketAiSignIn', 'Sign in before saving.'); return; }
        fields.disabled = true; status.textContent = marketI18n('marketAiSaving', 'Saving analysis…');
        try {
            const response = await fetch(endpoint, { method: 'PUT', headers: { ...marketAuthHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: value.model, content: value.content, expectedRevision: value.revision }) });
            if (!response.ok) {
                const message = response.status === 409 ? 'marketAiConflict' : response.status === 401 || response.status === 403 ? 'marketAiSignIn' : 'marketAiSaveError';
                throw new Error(message);
            }
            const payload = await response.json() as { analysis: MarketAiComment; saved: boolean };
            if (!payload.saved || !payload.analysis?.revision) throw new Error('marketAiSaveError');
            marketAiDrafts.delete(key);
            if (form.dataset.key === key && selectedMarketInstrument) {
                await loadMarketAiAnalysis(selectedMarketInstrument);
                if (form.dataset.key === key) {
                    renderMarketAiTable('market-ai-current', [payload.analysis]);
                    (document.getElementById('market-ai-revision') as HTMLInputElement).value = String(payload.analysis.revision);
                    status.textContent = marketI18n('marketAiSavedStatus', 'Saved · revision {revision}').replace('{revision}', String(payload.analysis.revision));
                }
            }
        } catch (error) {
            if (form.dataset.key === key) status.textContent = marketI18n(error instanceof Error ? error.message : 'marketAiSaveError', marketI18n('marketAiSaveError', 'Save failed; your draft is preserved.'));
        } finally { if (form.dataset.key === key) fields.disabled = false; }
    });
}

function marketUnderlyingCode(instrument: DashboardInstrument) {
    return instrument.productType === 'futures' ? (instrument.quote?.underlyingCode || instrument.underlyingCode || '') : '';
}

function marketEventsForInstrument(instrument: DashboardInstrument) {
    const underlyingCode = marketUnderlyingCode(instrument);
    return marketEventsByCode.get(instrument.code) || (underlyingCode ? marketEventsByCode.get(underlyingCode) : undefined) || [];
}

function renderMarketDetailHeader(instrument: DashboardInstrument) {
    const setText = (id: string, value: string) => { const element = document.getElementById(id); if (element) element.textContent = value; };
    const underlyingCode = marketUnderlyingCode(instrument);
    const scope = instrument.productType !== 'futures' ? ''
        : underlyingCode ? ` · ${marketText(`${underlyingCode} stock charts`, `${underlyingCode} 現股圖表`)}` : ` · ${marketText('TAIFEX futures charts', '期交所期貨圖表')}`;
    const marketLabel = instrumentMarketLabel(instrument, marketLocale() === 'zh-TW' ? 'zh' : 'en');
    setText('market-detail-title', `${instrument.code} · ${instrument.name}${marketLabel ? ` · ${marketLabel}` : ''}${scope}`);
    const institutionalDescription = document.getElementById('market-history-institutional-description');
    if (institutionalDescription) institutionalDescription.textContent = instrument.productType === 'futures'
        ? (underlyingCode
            ? `${underlyingCode} ${marketI18n('marketHistorySpotInstitutionalDescription', 'spot ticker institutional net trading · shares')}`
            : marketI18n('marketHistoryTaifexAggregateDescription', 'TAIFEX participant totals for the futures product category; not contract-specific positions.'))
        : marketI18n('marketHistoryInstitutionalDescription', 'Foreign, investment trust, and dealer net trading · shares');
}

function setMarketDetailInstrument(instrument: DashboardInstrument) {
    selectedMarketInstrument = instrument;
    const detail = document.getElementById('market-instrument-detail'); if (detail) detail.hidden = false;
    const placeholder = document.getElementById('market-chart-placeholder'); if (placeholder) placeholder.hidden = true;
    const underlyingCode = marketUnderlyingCode(instrument);
    renderMarketDetailHeader(instrument);
    // Keep all four tabs available. Stock futures use their underlying stock;
    // index futures show TAIFEX price/category data and explain unsupported
    // stock-only margin, lending, and ownership panels.
    // Overseas holdings get price, fundamentals and AI analysis from persisted IBKR/SEC data; institutional,
    // margin and ownership tabs are TWSE/TPEx/TDCC data with no overseas equivalent.
    const taiwan = isTaiwanInstrument(instrument);
    const overseasTabs = overseasDetailTabs();
    document.querySelectorAll<HTMLButtonElement>('[data-market-tab]').forEach((tab) => { tab.hidden = !taiwan && !overseasTabs.includes(tab.dataset.marketTab || ''); });
    document.getElementById('market-overseas-kpis')?.remove();
    if (taiwan) {
        const defaultTab = underlyingCode || instrument.productType === 'stock' ? 'fundamentals' : 'price';
        selectMarketDetailTab(preferredMarketTab ?? defaultTab);
    } else {
        selectMarketDetailTab(preferredMarketTab && overseasTabs.includes(preferredMarketTab) ? preferredMarketTab : 'price');
    }
}

function renderDashboardRows(targetId: string, instruments: DashboardInstrument[], emptyText: string) {
    const target = document.getElementById(targetId);
    if (!target) return;
    const detail = document.getElementById('market-instrument-detail');
    const openCode = detail && !detail.hidden && marketDetailRow && target.contains(marketDetailRow) ? marketDetailRow.dataset.marketCode : undefined;
    if (detail && target.contains(detail)) document.getElementById('market-chart-section')?.prepend(detail);
    target.replaceChildren();
    if (!instruments.length) {
        const empty = document.createElement('p');
        empty.className = 'market-updated';
        empty.textContent = emptyText;
        target.append(empty);
        return;
    }
    for (const instrument of instruments) {
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'market-watch-row market-watch-row--selected';
        row.dataset.marketCode = instrument.code;
        row.setAttribute('aria-expanded', 'false');
        const quote = instrument.quote;
        const item = document.createElement('span'); item.className = 'market-watch-instrument';
        const code = document.createElement('strong'); code.textContent = instrument.code;
        const name = document.createElement('small'); name.textContent = `${instrument.name} · ${instrument.productType === 'stock' ? marketText('Stock', '股票') : marketText('Futures', '期貨')}${quote?.deliveryMonth ? ` · ${quote.deliveryMonth}` : ''}`;
        item.append(code, name);
        const marketLabel = instrumentMarketLabel(instrument, marketLocale() === 'zh-TW' ? 'zh' : 'en');
        if (marketLabel) name.append(` · ${marketLabel}`);
        const analysisLabel = document.createElement('span'); analysisLabel.className = 'market-row-analysis';
        analysisLabel.textContent = marketText('Checking analysis…', '檢查評論…');
        item.append(analysisLabel);
        void loadRowAnalysisBadge(analysisLabel, instrument);
        const instrumentEvents = marketEventsForInstrument(instrument);
        if (instrumentEvents.length) {
            row.classList.add('market-watch-row--event');
            const badges = document.createElement('span'); badges.className = 'market-event-badges';
            for (const event of instrumentEvents.slice(0, 3)) {
                const badge = document.createElement('span'); badge.className = 'market-event-badge';
                badge.textContent = `${marketEventLabel(event.type)} \u00b7 ${event.date.slice(5)}`; badges.append(badge);
            }
            item.append(badges);
        }
        const price = document.createElement('span'); price.className = 'market-watch-price';
        const last = document.createElement('strong'); last.textContent = quote?.close ? formatNumber(quote.close, 'price') : '--';
        const change = document.createElement('small');
        // IBKR position quotes carry no previous close, so their change is unknown (—), not zero.
        change.textContent = quote ? `${formatNumber(quote.change, 'price', { signed: true })} (${formatNumber(quote.changePercent, 'percent', { signed: true })})` : marketText('Quote unavailable', '暫無報價');
        // Unchanged (0) stays neutral; only real moves get red/green.
        change.classList.toggle('up', Boolean(quote && quote.change > 0)); change.classList.toggle('down', Boolean(quote && quote.change < 0));
        price.append(last, change);
        const timestamp = document.createElement('span'); timestamp.className = 'market-updated';
        // Off-session or broker down: the backend serves the last saved price / last daily close; say so.
        const lastKnown = quote && quote.quoteSource && quote.quoteSource !== 'live'
            ? `${quote.quoteSource === 'dailyClose' ? marketText('Last close', '最後收盤') : marketText('Last price', '最後價格')} · ` : '';
        timestamp.textContent = quote?.timestamp ? `${lastKnown}${new Date(quote.timestamp).toLocaleString()}` : '--';
        if (!isTaiwanInstrument(instrument) && quote) {
            timestamp.prepend(`${brokerAvailabilityLabel(quote.availability, marketLocale() === 'zh-TW' ? 'zh' : 'en')} · `);
        }
        row.append(item, price, timestamp);
        row.addEventListener('click', () => {
            document.querySelectorAll<HTMLButtonElement>('.market-watch-row--selected').forEach((item) => item.setAttribute('aria-expanded', String(item === row && row.getAttribute('aria-expanded') !== 'true')));
            const detail = document.getElementById('market-instrument-detail');
            const expanded = row.getAttribute('aria-expanded') === 'true';
            if (detail) detail.hidden = !expanded;
            const placeholder = document.getElementById('market-chart-placeholder');
            if (placeholder) placeholder.hidden = expanded;
            if (expanded) { setMarketDetailInstrument(instrument); placeMarketDetail(row); }
        });
        target.append(row);
    }
    // Restore the open instrument after the rebuild, without scrolling the page.
    const reopened = openCode ? Array.from(target.querySelectorAll<HTMLElement>('[data-market-code]')).find((row) => row.dataset.marketCode === openCode) : undefined;
    if (reopened) { reopened.setAttribute('aria-expanded', 'true'); placeMarketDetail(reopened, false); }
}

async function fetchMarketDashboard() {
    try {
        const response = await fetch(astroApiPath('/api/market/dashboard'));
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json() as MarketDashboardPayload;
        marketAutoInstruments = data.automatic?.positions ?? [];
        marketCustomInstruments = data.custom ?? [];
        renderDashboardRows('market-auto-list', marketAutoInstruments, 'No complete valid holdings snapshot is available yet.');
        renderDashboardRows('market-custom-list', marketCustomInstruments, 'No custom instruments selected.');
        const updated = document.getElementById('market-auto-updated');
        if (updated) updated.textContent = data.automatic?.snapshotAt ? ` · Snapshot ${new Date(data.automatic.snapshotAt).toLocaleString()}` : '';
        await fetchMarketCompanyEvents();
    } catch (error) {
        console.error('Market dashboard unavailable:', error);
        renderDashboardRows('market-auto-list', [], 'Automatic selections are temporarily unavailable.');
        renderDashboardRows('market-custom-list', [], 'Custom selections are temporarily unavailable.');
    }
}


function marketEventLabel(type: MarketCompanyEvent['type']) {
    return type === 'monthly_revenue' ? marketI18n('marketEventRevenue', 'Revenue released')
        : type === 'financial_report' ? marketI18n('marketEventFinancialReport', 'Financial report')
            : marketI18n('marketEventConference', 'Investor conference');
}

async function fetchMarketCompanyEvents() {
    const body = document.getElementById('market-company-events-rows');
    const updated = document.getElementById('market-company-events-updated');
    if (!body) return;
    try {
        const response = await fetch(astroApiPath('/api/market/dashboard/events'));
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json() as { events?: MarketCompanyEvent[]; checkedAt?: string };
        const events = payload.events || [];
        marketEventsByCode = new Map();
        for (const event of events) {
            const group = marketEventsByCode.get(event.code) || [];
            group.push(event); marketEventsByCode.set(event.code, group);
        }
        marketEventInstruments.clear();
        for (const instrument of [...marketAutoInstruments, ...marketCustomInstruments]) {
            marketEventInstruments.set(instrument.code, instrument);
            const underlyingCode = marketUnderlyingCode(instrument);
            if (underlyingCode) marketEventInstruments.set(underlyingCode, instrument);
        }
        renderDashboardRows('market-auto-list', marketAutoInstruments, 'No complete valid holdings snapshot is available yet.');
        renderDashboardRows('market-custom-list', marketCustomInstruments, 'No custom instruments selected.');
        body.replaceChildren();
        if (!events.length) {
            const row = document.createElement('tr'); const cell = document.createElement('td');
            cell.colSpan = 4; cell.className = 'market-updated';
            cell.textContent = marketI18n('marketEventsEmpty', 'No recent releases or upcoming conferences for selected targets.');
            row.append(cell); body.append(row);
        }
        for (const event of events) {
            const row = document.createElement('tr');
            const dateCell = document.createElement('td'); dateCell.textContent = event.dateTime || event.date;
            const typeCell = document.createElement('td'); typeCell.textContent = marketEventLabel(event.type);
            const codeCell = document.createElement('td');
            const target = document.createElement('button'); target.type = 'button'; target.className = 'market-company-event-link';
            target.textContent = `${event.code} ${event.name}`;
            target.addEventListener('click', () => {
                const instrument = marketEventInstruments.get(event.code);
                if (!instrument) return;
                const marketRow = Array.from(document.querySelectorAll<HTMLButtonElement>('.market-watch-row--selected'))
                    .find((item) => {
                        const instrument = [...marketAutoInstruments, ...marketCustomInstruments].find((candidate) => candidate.code === item.dataset.marketCode);
                        return item.dataset.marketCode === event.code || Boolean(instrument && marketUnderlyingCode(instrument) === event.code);
                    });
                if (marketRow) marketRow.click();
                else { setMarketDetailInstrument(instrument); document.getElementById('market-instrument-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
            });
            codeCell.append(target);
            const periodCell = document.createElement('td'); periodCell.textContent = event.period || (event.status === 'upcoming' ? marketI18n('marketEventsScheduled', 'Scheduled') : marketI18n('marketEventsReleased', 'Released'));
            row.append(dateCell, typeCell, codeCell, periodCell);
            if (event.sourceUrl) row.title = `${event.source || ''} ? ${event.sourceUrl}`;
            body.append(row);
        }
        if (updated) updated.textContent = payload.checkedAt ? `${marketI18n('marketEventsUpdated', 'Updated')} ${new Date(payload.checkedAt).toLocaleString()}` : '';
    } catch (error) {
        console.error('Market company events unavailable:', error);
        const row = document.createElement('tr'); const cell = document.createElement('td');
        cell.colSpan = 4; cell.className = 'market-updated'; cell.textContent = marketI18n('marketEventsUnavailable', 'Company events are temporarily unavailable.');
        body.replaceChildren(row); row.append(cell);
    }
}

type MacroIndicator = { code: string; name: string; unit: string; frequency?: string; value: string; referencePeriod: string; previousValue?: string | null; previousPeriod?: string | null; change?: number | null; history?: Array<{period:string;value:string}>; expectationHistory?: Array<{period:string;value:string;source?:string;sourceUrl?:string}>; consensusHistory?: Array<{period:string;value:string;source?:string;sourceUrl?:string}>; fetchedAt?: string; source?: string; sourceUrl?: string; cacheStale?: boolean };
type MacroEvent = { id:string; groupId:string; type:string; title:string; scheduledDate:string; scheduledAt?:string|null; timePrecision:string; scheduleVerification:string; highlightLevel:string; source:string; sourceUrl:string; consensusValue?:string|null; actualValue?:string|null; surpriseValue?:string|null; surpriseStatus?:'above'|'below'|'in_line'|null; expectationSource?:string|null };
type MacroSnapshot = { status:string; enabled?:boolean; asOf?:string; indicators?:MacroIndicator[]; events?:MacroEvent[]; sources?:Array<{source:string;availability:string;stale:boolean}>; configuration?:Record<string,string> };


type MacroMetricFormat = MacroSeriesFormat;
type MacroMetricSpec = readonly [code: string, label: () => string, format: MacroMetricFormat];

// Card and tile definitions live in ./market/macroGroups.ts; this only resolves their labels in the page language.
const macroText = (text: MacroText) => 'key' in text ? marketI18n(text.key, text.en) : marketText(text.en, text.zh);
const MACRO_GROUPS: ReadonlyArray<{ id: string; eventGroups: readonly string[]; title: () => string; metrics: readonly MacroMetricSpec[] }> =
    MACRO_GROUP_SPECS.map((group) => ({ id: group.id, eventGroups: group.eventGroups, title: () => macroText(group.title),
        metrics: group.metrics.map((metric) => [metric.code, () => macroText(metric.label), metric.format] as const) }));

// Chart layout per card lives in ./market/macroLayout.ts (MACRO_MERGED_CHARTS).

function macroEventDate(event: MacroEvent, withTime = true) {
    const instant = macroEventInstant(event);
    const time = withTime && event.scheduledAt ? ` · ${instant.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Taipei' })}` : '';
    return `${instant.toLocaleDateString(undefined, { timeZone: 'Asia/Taipei', month: 'short', day: 'numeric' })}${time}`;
}

function macroHighlightLabel(level: string) {
    return level === 'urgent' ? marketI18n('macroWithin24','Within 24 hours') : level === 'soon' ? marketI18n('macroWithin72','Within 72 hours') : level === 'upcoming' ? marketI18n('macroWithinWeek','Within 7 days') : level === 'published' ? marketI18n('macroPublished','Just published') : level === 'waiting' ? marketI18n('macroWaiting','Awaiting publication') : '';
}

function buildMacroRelease(event: MacroEvent) {
    const card = document.createElement('a'); card.className = `macro-event macro-event--${event.highlightLevel || 'none'}`;
    card.href = event.sourceUrl; card.target = '_blank'; card.rel = 'noopener noreferrer'; card.title = event.title;
    const label = document.createElement('span'); label.className = 'macro-event-label';
    label.textContent = event.highlightLevel === 'waiting' || event.highlightLevel === 'published' ? marketText('This release', '本期公布') : marketText('Next release', '下次公布');
    const when = document.createElement('strong');
    const verification = event.scheduleVerification === 'confirmed' ? '' : ` · ${event.scheduleVerification === 'date_only' ? marketI18n('macroDateOnly','Date only') : marketI18n('macroExpected','Expected')}`;
    when.textContent = `${macroEventDate(event)}${verification}`;
    card.append(label, when);
    const badgeText = macroHighlightLabel(event.highlightLevel);
    if (badgeText) { const badge = document.createElement('small'); badge.textContent = badgeText; card.append(badge); }
    if (event.consensusValue != null || event.actualValue != null) {
        const expectation = document.createElement('span');
        expectation.className = 'macro-surprise-values';
        expectation.textContent = `${event.consensusValue == null ? marketI18n('macroNoConsensus','Consensus data unavailable') : `${marketI18n('macroConsensus','Consensus')} ${event.consensusValue}`}${event.actualValue == null ? '' : ` · ${marketI18n('macroActual','Actual')} ${event.actualValue}`}`;
        card.append(expectation);
        if (event.surpriseStatus) {
            const surprise = document.createElement('small');
            surprise.className = `macro-surprise macro-surprise--${event.surpriseStatus}`;
            surprise.textContent = event.surpriseStatus === 'above' ? marketI18n('macroAboveConsensus','Above expectations') : event.surpriseStatus === 'below' ? marketI18n('macroBelowConsensus','Below expectations') : marketI18n('macroInLineConsensus','In line with expectations');
            card.append(surprise);
        }
    }
    return card;
}

function buildMacroMetric(indicator: MacroIndicator, code: string, label: string, format: MacroMetricFormat, includeChart = true): HTMLElement {
    const card = document.createElement('article'); card.className = 'macro-indicator-card';
    const heading = document.createElement('span'); heading.textContent = label;
    const value = document.createElement('strong');
    let current = Number(indicator.value); let change: number | null = indicator.change ?? null;
    let fallbackLabel = '';
    let suffix = format === 'raw' ? ` ${indicator.unit}` : indicator.unit === 'percent' ? '%' : '';
    if (format === 'jobs') { current = (Number(indicator.value) - Number(indicator.previousValue ?? indicator.value)) * 1000; suffix = ` ${marketI18n('macroJobs','jobs')}`; }
    if (format === 'mom' || format === 'yoy') {
        const months = indicator.history || []; const offset = format === 'mom' ? 1 : 12;
        const previous = months.find((point) => point.period === shiftMacroPeriod(indicator.referencePeriod, -offset));
        if (previous && Number(previous.value) !== 0) { change = (Number(indicator.value) / Number(previous.value) - 1) * 100; current = change; suffix = '%'; }
        else if (format === 'mom' && indicator.previousValue !== null && indicator.previousValue !== undefined && Number(indicator.previousValue) !== 0) {
            current = (Number(indicator.value) / Number(indicator.previousValue) - 1) * 100;
            change = current;
            suffix = '%';
            fallbackLabel = `${marketI18n('macroPreviousPeriod','Previous')} ${indicator.previousPeriod || ''}`;
        } else {
            current = Number(indicator.value);
            suffix = '';
            fallbackLabel = marketI18n('macroLatestIndex','Latest index level');
        }
    } else if (format === 'claims') { current = Number(indicator.value); suffix = ` ${marketText('claims', '人')}`; }
    else if (format === 'percent') current = Number(indicator.value);
    else if (format === 'jobs') current = Number.isFinite(change) ? Number(change) * 1000 : NaN;
    else current = Number(indicator.value);
    if (format === 'raw' && (code === 'TW_EXPORTS' || code === 'TW_IMPORTS')) {
        current /= 1_000_000;
        suffix = ' NT$ B';
    }
    const tradeValue = format === 'raw' && (code === 'TW_EXPORTS' || code === 'TW_IMPORTS');
    const valueKind: NumberKind = suffix === '%' ? 'percent' : tradeValue ? 'count' : numberKindFor(indicator.unit, format === 'mom' || format === 'yoy' ? undefined : format);
    const valueDigits = format === 'percent' ? publishedDigits(indicator.value) : undefined;
    value.textContent = `${formatNumber(current, valueKind, { locale: marketLocale(), digits: valueDigits })}${valueKind === 'percent' ? '' : suffix}`;
    const meta = document.createElement('small');
    const sourceTime = indicator.fetchedAt ? new Date(indicator.fetchedAt).toLocaleString(marketLocale(), { timeZone: 'Asia/Taipei' }) : '';
    meta.textContent = `${macroPeriodLabel(indicator.referencePeriod, indicator.frequency)} · ${marketI18n('macroDataAsOf','reported period')}${sourceTime ? ` · ${sourceTime}` : ''}${indicator.cacheStale ? ` · ${marketText('cached data is stale','快取資料已過期')}` : ''}`;
    if (indicator.sourceUrl) {
        const sourceLink = document.createElement('a');
        sourceLink.href = indicator.sourceUrl; sourceLink.target = '_blank'; sourceLink.rel = 'noopener noreferrer';
        sourceLink.textContent = `${indicator.source || marketText('Source','來源')} ↗`;
        meta.append(document.createTextNode(' · '), sourceLink);
    } else if (indicator.source) meta.append(document.createTextNode(` · ${indicator.source}`));
    const delta = document.createElement('small'); delta.className = 'macro-indicator-change';
    if (format === 'percent' && change !== null) delta.textContent = formatNumber(change, 'pp', { signed: true, locale: marketLocale(), digits: publishedDigits(indicator.value, indicator.previousValue) });
    if (format === 'jobs') delta.textContent = marketI18n('macroMonthlyChange','Change from previous month');
    if (format === 'claims' && change !== null) delta.textContent = `${formatNumber(change, 'count', { signed: true, locale: marketLocale() })} ${marketText('from prior week', '較前週')} `;
    if (format === 'mom' || format === 'yoy') delta.textContent = fallbackLabel || (format === 'mom' ? marketI18n('macroMonthOverMonth','Month over month') : marketI18n('macroYearOverYear','Year over year'));
    if (format === 'sales') {
        const previousSales = indicator.previousValue !== null && indicator.previousValue !== undefined
            ? Number(indicator.previousValue)
            : NaN;
        if (Number.isFinite(previousSales) && previousSales !== 0) {
            const monthChange = (Number(indicator.value) / previousSales - 1) * 100;
            value.textContent = formatNumber(monthChange, 'percent', { signed: true, locale: marketLocale() });
            delta.textContent = `${marketI18n('macroMonthOverMonth','Month over month')} · ${formatNumber(indicator.value, 'millions', { locale: marketLocale() })} M USD`;
            const prior = document.createElement('small');
            prior.textContent = `${marketI18n('macroPreviousPeriod','Previous')} ${indicator.previousPeriod || ''}: ${formatNumber(previousSales, 'millions', { locale: marketLocale() })} M USD`;
            card.append(heading, value, meta, delta, prior);
            if (includeChart) card.append(buildMacroTrendChart(indicator, format, label));
            return card;
        }
        value.textContent = `${formatNumber(indicator.value, 'millions', { locale: marketLocale() })} M USD`;
        delta.textContent = marketI18n('macroLatestObservation','Latest stored observation');
    } else if (format === 'percent' && code === 'DGS10') {
        delta.textContent = indicator.previousValue !== null && indicator.previousValue !== undefined
            ? `${marketI18n('macroPreviousPeriod','Previous')} ${indicator.previousPeriod || ''}: ${formatNumber(indicator.previousValue, 'percent', { locale: marketLocale() })}`
            : marketI18n('macroLatestObservation','Latest stored observation');
    }
    if (indicator.previousValue !== null && indicator.previousValue !== undefined && format !== 'sales' && code !== 'DGS10') {
        const prior = document.createElement('small');
        const previousMetric = indicator.previousPeriod
            ? macroMetricForPeriod(indicator, format, indicator.previousPeriod)
            : null;
        const locale = marketLocale();
        const priorValue = previousMetric !== null
            ? formatWithUnit(previousMetric, indicator.unit, format, format === 'jobs' ? marketI18n('macroJobs','jobs') : format === 'claims' ? marketText('persons', '人') : '',
                { locale, digits: format === 'percent' ? publishedDigits(indicator.previousValue) : undefined })
            : format === 'jobs'
                ? `${formatNumber(indicator.previousValue, 'count', { locale })} ${marketI18n('macroLatestObservation','Latest stored observation')}`
                : format === 'claims'
                    ? formatWithUnit(indicator.previousValue, indicator.unit, 'claims', marketText('persons', '人'), { locale })
                : `${formatWithUnit(indicator.previousValue, indicator.unit, undefined, '', { locale })}${format === 'mom' || format === 'yoy' ? ` · ${marketI18n('macroLatestIndex','Latest index level')}` : ''}`;
        prior.textContent = `${marketI18n('macroPreviousPeriod','Previous')} ${macroPeriodLabel(indicator.previousPeriod || '', indicator.frequency)}: ${priorValue}`;
        card.append(heading, value, meta, delta, prior);
    } else {
        card.append(heading, value, meta, delta);
    }
    if (includeChart) card.append(buildMacroTrendChart(indicator, format, label));
    return card;
}

// separateAxes: series in different units (e.g. USD/TWD, JPY/USD, dollar index) share the date axis but each of the
// first three gets its own y-axis (left, right, outer right) drawn in that series' color.
function buildMacroTrendChart(indicator: MacroIndicator, format: MacroMetricFormat, indicatorLabel: string, comparisons: Array<{ indicator: MacroIndicator; format: MacroMetricFormat; label: string }> = [], options: { separateAxes?: boolean } = {}): HTMLElement {
    const wrap = document.createElement('section');
    wrap.className = 'macro-trend-chart';
    const baseSeriesLabel = indicatorLabel;
    const raw = (indicator.history || []).map((item) => ({ period: item.period, value: Number(item.value) }))
        .filter((item) => Number.isFinite(item.value)).slice(-macroHistoryLimit(indicator.history, indicator.code));
    const points = macroSeriesPoints(indicator.history, format, indicator.code);
    const comparisonLines = comparisons.map((comparison) => ({ label: comparison.label, code: comparison.indicator.code,
        values: macroSeriesPoints(comparison.indicator.history, comparison.format, comparison.indicator.code),
        format: comparison.format, unit: comparison.indicator.unit }));
    const retailYear = format === 'sales' ? raw.flatMap((item) => {
        const previous = raw.find((candidate) => candidate.period === shiftMacroPeriod(item.period, -12));
        return previous && previous.value !== 0 ? [{ period: item.period, value: (item.value / previous.value - 1) * 100 }] : [];
    }) : [];
    const expectationIndicator = comparisons.find((item) => item.indicator.code === 'CUUR0000SA0')?.indicator || indicator;
    const expected = (expectationIndicator.expectationHistory || []).map((item) => ({ period: item.period, value: Number(item.value) }))
        .filter((item) => Number.isFinite(item.value));
    const consensus = (expectationIndicator.consensusHistory || []).map((item) => ({ period: item.period, value: Number(item.value) }))
        .filter((item) => Number.isFinite(item.value));
    const periods = [...new Set([...points.map((point) => point.period), ...comparisonLines.flatMap((line) => line.values.map((point) => point.period)), ...retailYear.map((point) => point.period), ...expected.map((point) => point.period), ...consensus.map((point) => point.period)])].sort();
    const periodIndex = new Map(periods.map((period, index) => [period, index]));
    const unitLabel = format === 'jobs' ? marketText('Monthly change (jobs)', '月增人數')
        : format === 'claims' ? marketText('Initial claims (persons)', '初領失業救濟金人數')
        : format === 'yoy' ? marketText('Year-over-year (%)', '年增率 (%)')
        : format === 'rebased' ? marketText('Index (Jan 2020 = 100)', '指數 (2020-01 = 100)')
            : ['mom', 'sales'].includes(format) ? marketText(format === 'sales' ? 'Change (%)' : 'Month-over-month (%)', format === 'sales' ? '變動率 (%)' : '月增率 (%)')
                : indicator.code === 'DGS10' ? marketText('Yield (%)', '殖利率 (%)')
                    : marketText('Rate (%)', '百分比');
    const displayUnit = format === 'raw' ? (indicator.code === 'TW_EXPORTS' || indicator.code === 'TW_IMPORTS' ? 'NT$ billion' : indicator.unit) : unitLabel;
    const allValues = [...points, ...comparisonLines.flatMap((line) => line.values), ...retailYear, ...expected, ...consensus];
    if (allValues.length < 2) {
        const empty = document.createElement('p'); empty.className = 'macro-trend-empty';
        empty.textContent = format === 'yoy'
            ? marketText('YoY trend needs at least 13 saved monthly observations.', '年增率趨勢至少需要 13 個月的已保存資料。')
            : marketText('Not enough saved observations to draw a trend.', '已保存的觀察值不足，暫時無法繪圖。');
        wrap.append(empty); return wrap;
    }
    type ChartSeries = { tone: MacroSeriesTone; label: string; values: Array<{ period: string; value: number; raw?: number }>; format: MacroMetricFormat; unit: string; axis: number; code?: string };
    const separate = Boolean(options.separateAxes) && comparisonLines.length > 0;
    const series: ChartSeries[] = [
        { tone: 'base' as MacroSeriesTone, label: baseSeriesLabel, values: points, format, unit: displayUnit, axis: 0, code: indicator.code },
        ...comparisonLines.map((line, index) => ({ tone: `series-${index + 1}` as MacroSeriesTone, label: line.label, values: line.values,
            format: line.format, unit: line.unit, axis: separate ? Math.min(index + 1, 2) : 0, code: line.code })),
        ...(retailYear.length ? [{ tone: 'series-3' as MacroSeriesTone, label: marketText('Year over year', '年增'), values: retailYear, format: 'yoy' as MacroMetricFormat, unit: '%', axis: 0 }] : []),
        ...(expected.length ? [{ tone: 'expected' as MacroSeriesTone, label: marketText('One-year consumer expectation', '消費者一年期預期'), values: expected, format, unit: displayUnit, axis: 0 }] : []),
        ...(consensus.length ? [{ tone: 'consensus' as MacroSeriesTone, label: marketText('CPI release consensus', 'CPI 公布共識預期'), values: consensus, format, unit: displayUnit, axis: 0 }] : []),
    ].filter((item) => item.values.length);
    const axisCount = Math.max(...series.map((item) => item.axis)) + 1;
    const width = 340, height = 152, left = 48, right = 10 + (axisCount - 1) * 40, top = 8, bottom = 34;
    const plotWidth = width - left - right, plotHeight = height - top - bottom;
    const ranges = Array.from({ length: axisCount }, (_, axis) => macroAxisRange(series.filter((item) => item.axis === axis).flatMap((item) => item.values.map((point) => point.value))));
    const { low, high } = ranges[0];
    const x = (period: string) => left + ((periodIndex.get(period) || 0) / Math.max(periods.length - 1, 1)) * plotWidth;
    const yOn = (axis: number, value: number) => top + ((ranges[axis].high - value) / (ranges[axis].high - ranges[axis].low)) * plotHeight;
    const y = (value: number) => yOn(0, value);
    const toneColor = (tone: MacroSeriesTone) => MACRO_SERIES_TONES[tone];
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`); svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', `${marketI18n('macroTrend','Trend')}: ${series.map((item) => item.label).join(' / ')}`);
    const add = (tag: string, attrs: Record<string, string>, text?: string) => {
        const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
        Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
        if (text !== undefined) node.textContent = text;
        svg.append(node); return node;
    };
    const tickText = (value: number, tickFormat: MacroMetricFormat, unit = indicator.unit) => formatAxisTick(value, numberKindFor(unit, tickFormat), marketLocale());
    for (let tick = 0; tick <= 3; tick++) {
        const value = low + ((high - low) * tick) / 3, tickY = y(value);
        add('line', { x1: String(left), x2: String(width - right), y1: String(tickY), y2: String(tickY), class: 'macro-trend-gridline' });
        add('text', { x: String(left - 6), y: String(tickY + 3), 'text-anchor': 'end', class: 'macro-trend-axis-label', ...(separate ? { style: `fill:${toneColor('base')}` } : {}) }, tickText(value, format, indicator.unit));
        for (let axis = 1; axis < axisCount; axis++) {
            const owner = series.find((item) => item.axis === axis)!;
            const axisValue = ranges[axis].low + ((ranges[axis].high - ranges[axis].low) * tick) / 3;
            add('text', { x: String(width - right + 4 + (axis - 1) * 40), y: String(tickY + 3), 'text-anchor': 'start', class: 'macro-trend-axis-label', style: `fill:${toneColor(owner.tone)}` }, tickText(axisValue, owner.format, owner.unit));
        }
    }
        add('text', { x: '10', y: String(top + plotHeight / 2), transform: `rotate(-90 10 ${top + plotHeight / 2})`, 'text-anchor': 'middle', class: 'macro-trend-axis-title', ...(separate ? { style: `fill:${toneColor('base')}` } : {}) }, displayUnit);
    add('line', { x1: String(left), x2: String(width - right), y1: String(top + plotHeight), y2: String(top + plotHeight), class: 'macro-trend-axis' });
    const pathOn = (axis: number, values: Array<{period:string;value:number}>) => values.map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(point.period).toFixed(1)} ${yOn(axis, point.value).toFixed(1)}`).join(' ');
    series.forEach((item) => add('path', { d: pathOn(item.axis, item.values), class: `macro-trend-line macro-trend-line--${item.tone}`, style: `--tone:${toneColor(item.tone)}` }));
    const readout = document.createElement('div');
    readout.className = 'market-chart-readout market-chart-readout--compact macro-trend-readout';
    readout.setAttribute('aria-live', 'polite');
    readout.setAttribute('role', 'status');
    // A rebased money stock reads as its index plus the amount in its own currency (trillions).
    const describeMacroPoint = (point: { period: string; value: number; raw?: number }, pointFormat = format, pointUnit = displayUnit, code = indicator.code) => {
        if (pointFormat === 'rebased') {
            const stock = point.raw === undefined ? null : macroMoneyStock(code, point.raw);
            const index = formatNumber(point.value, 'decimal', { digits: 1, locale: marketLocale() });
            return stock ? `${index} (${stock.currency} ${formatNumber(stock.trillions, 'decimal', { digits: 2, locale: marketLocale() })} ${marketText('trillion', '兆')})` : index;
        }
        return formatWithUnit(point.value, pointFormat === 'raw' ? pointUnit : pointFormat === 'percent' ? 'percent' : pointUnit, pointFormat,
            pointFormat === 'jobs' ? marketI18n('macroJobs','jobs') : pointFormat === 'claims' ? marketText('persons', '人') : undefined,
            { locale: marketLocale(), digits: pointFormat === 'percent' ? publishedDigits(point.value) : undefined });
    };
    let showPoint: (index: number, hovering: boolean) => void;
    const addAccessiblePoint = (point: {period:string;value:number}, isExpected = false) => {
        const expectationLabel = marketText('One-year consumer expectation', '消費者一年期通膨預期');
        const dot = add('circle', { cx: String(x(point.period)), cy: String(y(point.value)), r: isExpected ? '4' : points.length > 36 ? '2' : '3', class: isExpected ? 'macro-trend-point macro-trend-point--expected' : 'macro-trend-point', style: `--tone:${toneColor(isExpected ? 'expected' : 'base')}`, tabindex: '0', role: 'button', 'aria-label': `${isExpected ? expectationLabel : baseSeriesLabel} ${point.period} ${describeMacroPoint(point)}` });
        dot.addEventListener('focus', () => showPoint(periodIndex.get(point.period) || 0, true));
        dot.addEventListener('click', () => showPoint(periodIndex.get(point.period) || 0, true));
    };
    // Daily series (~130 sessions) would turn per-point dots into a solid bar and 130 tab stops; they draw the line
    // only and rely on the snapping guide, the readout and ←/→ on the focused chart.
    const dense = periods.length > 60;
    if (!dense) points.forEach((point) => addAccessiblePoint(point));
    if (!dense) comparisonLines.forEach((line, index) => line.values.forEach((point) => {
        const tone = `series-${index + 1}` as MacroSeriesTone;
        const dot = add('circle', { cx: String(x(point.period)), cy: String(yOn(series.find((item) => item.tone === tone)?.axis ?? 0, point.value)), r: '3', class: `macro-trend-point macro-trend-point--${tone}`, style: `--tone:${toneColor(tone)}`, tabindex: '0', role: 'button', 'aria-label': `${line.label} ${point.period} ${describeMacroPoint(point, line.format, line.unit, line.code)}` });
        dot.addEventListener('focus', () => showPoint(periodIndex.get(point.period) || 0, true));
        dot.addEventListener('click', () => showPoint(periodIndex.get(point.period) || 0, true));
    }));
    retailYear.forEach((point) => {
        const dot = add('circle', { cx: String(x(point.period)), cy: String(y(point.value)), r: '3', class: 'macro-trend-point macro-trend-point--series-3', style: `--tone:${toneColor('series-3')}`, tabindex: '0', role: 'button', 'aria-label': `${marketText('Year over year', '年增')} ${point.period} ${point.value.toFixed(2)}%` });
        dot.addEventListener('focus', () => showPoint(periodIndex.get(point.period) || 0, true));
        dot.addEventListener('click', () => showPoint(periodIndex.get(point.period) || 0, true));
    });
    expected.forEach((point) => addAccessiblePoint(point, true));
    consensus.forEach((point) => {
        const dot = add('circle', { cx: String(x(point.period)), cy: String(y(point.value)), r: '4', class: 'macro-trend-point macro-trend-point--consensus', style: `--tone:${toneColor('consensus')}`, tabindex: '0', role: 'button', 'aria-label': `CPI release consensus ${point.period} ${describeMacroPoint(point)}` });
        dot.addEventListener('focus', () => showPoint(periodIndex.get(point.period) || 0, true));
        dot.addEventListener('click', () => showPoint(periodIndex.get(point.period) || 0, true));
    });
    // Vertical guide snaps to the nearest period anywhere over the plot, so the pointer need not hit a dot.
    const guide = add('line', { y1: String(top), y2: String(top + plotHeight), class: 'macro-trend-guide' });
    const markers = series.map((item) => add('circle', { r: '4.5', class: 'macro-trend-marker', style: `--tone:${toneColor(item.tone)}` }));
    let active = periods.length - 1;
    showPoint = (index: number, hovering: boolean) => {
        active = index;
        const period = periods[index];
        // One colored entry per series (same color as its line, marker and axis) so each value matches its line.
        readout.replaceChildren();
        const date = document.createElement('strong'); date.textContent = macroPeriodLabel(period, indicator.frequency); readout.append(date);
        series.forEach((item, index) => {
            const value = macroValueAtOrBefore(item.values, period);
            const marker = markers[index];
            marker.style.display = hovering && value ? '' : 'none';
            if (!value) return;
            marker.setAttribute('cx', String(x(value.period))); marker.setAttribute('cy', String(yOn(item.axis, value.value)));
            const entry = document.createElement('span'); entry.className = 'macro-trend-readout-item';
            entry.style.setProperty('--tone', toneColor(item.tone));
            const name = series.length > 1 || format === 'sales' ? item.label : marketText('Actual', '實際');
            // A carried-forward close (another market's calendar) shows its own date.
            entry.textContent = `${name} ${describeMacroPoint(value, item.format, item.unit, item.code)}${value.period === period ? '' : ` (${value.period.slice(5)})`}`;
            readout.append(entry);
        });
        guide.setAttribute('x1', String(x(period))); guide.setAttribute('x2', String(x(period)));
        guide.style.display = hovering ? '' : 'none';
    };
    showPoint(active, false);
    const indexAt = (event: PointerEvent) => {
        const rect = svg.getBoundingClientRect();
        const viewX = (event.clientX - rect.left) / rect.width * width;
        return Math.max(0, Math.min(periods.length - 1, Math.round((viewX - left) / plotWidth * (periods.length - 1))));
    };
    svg.addEventListener('pointermove', (event) => showPoint(indexAt(event), true));
    svg.addEventListener('pointerdown', (event) => showPoint(indexAt(event), true));
    svg.addEventListener('pointerleave', () => showPoint(periods.length - 1, false));
    svg.setAttribute('tabindex', '0');
    svg.addEventListener('keydown', (event) => {
        const step = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
        if (!step) return;
        event.preventDefault();
        showPoint(Math.max(0, Math.min(periods.length - 1, active + step)), true);
    });
    svg.addEventListener('blur', () => showPoint(periods.length - 1, false));
    [...new Set([0, Math.floor((periods.length - 1) / 2), periods.length - 1])].forEach((index) => {
        add('text', { x: String(x(periods[index])), y: String(height - 16), 'text-anchor': index === 0 ? 'start' : index === periods.length - 1 ? 'end' : 'middle', class: 'macro-trend-axis-label' }, macroPeriodLabel(periods[index], indicator.frequency));
    });
    add('text', { x: String(left + plotWidth / 2), y: String(height - 1), 'text-anchor': 'middle', class: 'macro-trend-axis-title' }, marketText('Date', '日期'));
    wrap.append(svg, readout);
    const legendItems: Array<{ label: string; tone: MacroSeriesTone }> = series.map((item) => ({ label: item.label, tone: item.tone }));
    if (legendItems.length > 1) {
        const legend = document.createElement('div'); legend.className = 'macro-trend-legend macro-trend-legend--series';
        for (const item of legendItems) {
            const entry = document.createElement('span'); entry.className = `macro-trend-legend-item macro-trend-legend-item--${item.tone}`; entry.style.setProperty('--tone', toneColor(item.tone)); entry.textContent = item.label; legend.append(entry);
        }
        wrap.append(legend);
    }
    // The Michigan expectation and the release consensus are annual rates: only the YoY CPI chart cites them.
    if (indicator.code === 'CUUR0000SA0') {
        const michiganLink = document.createElement('a'); michiganLink.href = 'https://www.sca.isr.umich.edu/tables.html'; michiganLink.target = '_blank'; michiganLink.rel = 'noopener noreferrer';
        michiganLink.textContent = marketText('Michigan expectation source', '密西根大學預期來源');
        const calendarLink = document.createElement('a'); calendarLink.href = 'https://www.financecalendar.com/api/'; calendarLink.target = '_blank'; calendarLink.rel = 'noopener noreferrer';
        calendarLink.textContent = marketText('Calendar consensus source', '經濟日曆共識來源');
        wrap.append(michiganLink, document.createTextNode(' · '), calendarLink);
    }
    return wrap;
}

// Growth comparison with a MoM / YoY toggle: each mode draws only lines of that rate (AGENTS.md: MoM with MoM,
// YoY with YoY). The chosen mode survives the dashboard's periodic redraws.
function buildMacroGrowthChart(chartId: string, byCode: Map<string, MacroIndicator>): HTMLElement | null {
    const chart = MACRO_GROWTH_CHARTS[chartId];
    if (!chart || !chart.lines.yoy.some((line) => byCode.has(line.code))) return null;
    const section = document.createElement('section');
    section.className = 'macro-comparison-switcher';
    const controls = document.createElement('div');
    controls.className = 'macro-comparison-switcher-controls';
    controls.setAttribute('role', 'group');
    controls.setAttribute('aria-label', marketText('Compare matching growth rates', '比較相同頻率的增長率'));
    const host = document.createElement('div');
    const render = () => {
        const mode = macroGrowthMode(chartId);
        buttons.forEach(({ value, button }) => button.setAttribute('aria-pressed', String(value === mode)));
        const lines = (chart.lines[mode] || []).flatMap((line) => {
            const indicator = byCode.get(line.code);
            return indicator ? [{ indicator, format: line.format as MacroMetricFormat, label: marketText(line.label.en, line.label.zh) }] : [];
        });
        const [base, ...rest] = lines;
        host.replaceChildren(...(base ? [buildMacroTrendChart(base.indicator, base.format, base.label, rest)] : []));
    };
    const buttons = macroGrowthModes(chartId).map((value) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'macro-comparison-switcher-button';
        button.textContent = value === 'level' ? marketText('Money stock (Jan 2020 = 100)', '存量 (2020-01 = 100)')
            : value === 'mom' ? marketText('Month over month', '月增率比較') : marketText('Year over year', '年增率比較');
        button.addEventListener('click', () => { setMacroGrowthMode(chartId, value); render(); });
        controls.append(button);
        return { value, button };
    });
    section.append(controls, host);
    render();
    return section;
}

function renderMacroDashboard(snapshot: MacroSnapshot) {
    const grid = document.getElementById('macro-indicator-grid');
    const list = document.getElementById('macro-event-list');
    const status = document.getElementById('macro-dashboard-status');
    if (!list || !grid) return;
    grid.replaceChildren(); list.replaceChildren();
    const byCode = new Map((snapshot.indicators || []).map((item) => [item.code, item]));
    const events = dedupeMacroEvents(snapshot.events || []);
    const claimed = new Set<MacroEvent>();
    for (const group of MACRO_GROUPS) {
        const inGroup = events.filter((event) => group.eventGroups.includes(event.groupId)
            && (group.id === 'consumption' || !MACRO_FOREIGN_EVENT.test(event.title)));
        inGroup.forEach((event) => claimed.add(event));
        // Past releases stay visible only while flagged (awaiting data or just published).
        const now = Date.now();
        const groupEvents = inGroup.filter((event) => macroEventInstant(event).getTime() >= now || event.highlightLevel === 'waiting' || event.highlightLevel === 'published');
        const metricIndicators = group.metrics.flatMap(([code, label, format]) => {
            const indicator = byCode.get(code);
            return indicator ? [{ indicator, code, label: label(), format }] : [];
        });
        const growthCharts = Object.keys(MACRO_GROWTH_CHARTS).filter((id) => MACRO_GROWTH_CHARTS[id].group === group.id);
        const combinedCharts = growthCharts.length > 0 || Boolean(MACRO_MERGED_CHARTS[group.id]);
        const metrics = metricIndicators.map(({ indicator, code, label, format }) =>
            buildMacroMetric(indicator, code, label, format, !combinedCharts));
        if (!metrics.length && !groupEvents.length) continue;
        const card = document.createElement('article'); card.className = `macro-group macro-group--${group.id}`;
        const header = document.createElement('header'); header.className = 'macro-group-header';
        const title = document.createElement('h5'); title.textContent = group.title();
        header.append(title);
        const [next, ...later] = groupEvents;
        if (next) header.append(buildMacroRelease(next));
        const metricGrid = document.createElement('div'); metricGrid.className = 'macro-metric-grid';
        metricGrid.style.setProperty('--macro-cols', String(metrics.length >= 4 ? 2 : Math.max(metrics.length, 1)));
        metricGrid.append(...metrics);
        card.append(header, metricGrid);
        if (MACRO_MERGED_CHARTS[group.id]) {
            const spec = new Map(group.metrics.map(([code, label, format]) => [code, { label, format }]));
            for (const codes of MACRO_MERGED_CHARTS[group.id]) {
                const [base, ...rest] = codes.flatMap((choice) => {
                    const code = resolveMacroCode(choice, (candidate) => byCode.has(candidate));
                    const indicator = byCode.get(code); const meta = spec.get(code);
                    return indicator && meta ? [{ indicator, format: meta.format, label: meta.label() }] : [];
                });
                if (base) card.append(buildMacroTrendChart(base.indicator, base.format, base.label, rest, { separateAxes: macroChartNeedsSeparateAxes([base, ...rest].map((item) => ({ format: item.format, unit: item.indicator.unit }))) }));
            }
        }
        for (const id of growthCharts) {
            const growth = buildMacroGrowthChart(id, byCode);
            if (growth) card.append(growth);
        }
        if (later.length) {
            const upcoming = document.createElement('p'); upcoming.className = 'macro-later';
            upcoming.textContent = `${marketText('Then', '之後')}: ${later.map((event) => macroEventDate(event, false)).join(' · ')}`;
            card.append(upcoming);
        }
        grid.append(card);
    }
    if (!grid.childElementCount) {
        const empty = document.createElement('p'); empty.className = 'market-updated';
        empty.textContent = snapshot.status === 'disabled' ? marketI18n('macroNotConfigured','Macro data collection is not enabled yet.') : marketI18n('macroNoEvents','No upcoming macro releases in the calendar.');
        grid.append(empty);
    }
    const others = events.filter((event) => !claimed.has(event));
    list.hidden = !others.length;
    if (others.length) {
        const heading = document.createElement('span'); heading.className = 'macro-other-title';
        heading.textContent = marketText('Other releases', '其他經濟事件');
        list.append(heading);

        for (const event of others.slice(0, 12)) list.append(buildMacroRelease(event));

    }
    if (status) {
        const stale = (snapshot.sources || []).some((source) => source.stale);
        status.textContent = snapshot.status === 'disabled' ? marketI18n('macroNotConfigured','Macro data collection is not enabled yet.')
            : `${stale ? marketI18n('macroStale','Some data sources are stale') : marketI18n('macroUpdated','Updated')} · ${snapshot.asOf ? new Date(snapshot.asOf).toLocaleString() : ''}`;
    }
}

function macroMetricForPeriod(indicator: MacroIndicator, format: string, period: string): number | null {
    const history = indicator.history || [];
    const point = history.find((item) => item.period === period);
    if (!point) return null;
    const value = Number(point.value);
    if (!Number.isFinite(value)) return null;
    if (format === 'jobs' || format === 'mom' || format === 'yoy') {
        const offset = format === 'yoy' ? 12 : 1;
        const base = history.find((item) => item.period === shiftMacroPeriod(period, -offset));
        if (!base) return null;
        const baseValue = Number(base.value);
        if (!Number.isFinite(baseValue) || baseValue === 0) return null;
        return format === 'jobs' ? (value - baseValue) * 1000 : (value / baseValue - 1) * 100;
    }
    return value;
}

async function fetchMacroDashboard() {
    const section = document.getElementById('macro-dashboard'); if (!section) return;
    try {
        const response = await fetch(astroApiPath('/api/market/dashboard/macro?historyMonths=24'));
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        renderMacroDashboard(await response.json() as MacroSnapshot);
    } catch (error) {
        console.error('Macro dashboard unavailable:', error);
        renderMacroDashboard({ status: 'unavailable', indicators: [], events: [] });
    }
}

type CustomInstrument = { code: string; name: string; productType: 'stock' | 'futures'; deliveryMonth?: string };
const CUSTOM_LIMIT = 5;

function initMarketCustomEditor() {
    const button = document.getElementById('market-custom-edit') as HTMLButtonElement | null;
    const dialog = document.getElementById('market-custom-dialog') as HTMLDialogElement | null;
    if (!button || !dialog || button.dataset.bound === 'true' || !hasMarketAuth()) return;
    button.dataset.bound = 'true';
    let selected: CustomInstrument[] = [];
    let saved = '';
    let lastResults: CustomInstrument[] = [];
    let searchSeq = 0;
    let debounce: number | null = null;
    const slots = document.getElementById('market-custom-selected');
    const results = document.getElementById('market-search-results');
    const heading = document.getElementById('market-search-heading');
    const state = document.getElementById('market-search-state');
    const error = document.getElementById('market-custom-error');
    const input = document.getElementById('market-symbol-search') as HTMLInputElement | null;
    const saveButton = document.getElementById('market-custom-save') as HTMLButtonElement | null;
    const key = (item: { code: string }) => item.code.toUpperCase();
    const isSelected = (item: CustomInstrument) => selected.some((value) => key(value) === key(item));
    const typeBadge = (item: CustomInstrument) => {
        const badge = document.createElement('span');
        badge.className = `mcd-badge${item.productType === 'futures' ? ' mcd-badge--futures' : ''}`;
        badge.textContent = item.productType === 'futures'
            ? `${marketText('Futures', '期貨')}${item.deliveryMonth ? ` ${item.deliveryMonth}` : ''}` : marketText('Stock', '股票');
        return badge;
    };
    const label = (item: CustomInstrument, withBadge: boolean) => {
        const text = document.createElement('span'); text.className = 'mcd-slot-text';
        const code = document.createElement('strong'); code.className = 'mcd-code'; code.textContent = item.code;
        const name = document.createElement('span'); name.className = 'mcd-name'; name.textContent = item.name; name.title = item.name;
        text.append(code, name); if (withBadge) text.append(typeBadge(item));
        return text;
    };
    const refresh = () => {
        if (!slots) return;
        slots.replaceChildren();
        const count = document.getElementById('market-custom-count'); if (count) count.textContent = `${selected.length} / ${CUSTOM_LIMIT}`;
        for (let index = 0; index < CUSTOM_LIMIT; index++) {
            const slot = document.createElement('li');
            const item = selected[index];
            if (!item) { slot.className = 'mcd-slot mcd-slot--empty'; slot.textContent = marketText('Empty slot', '空位'); slots.append(slot); continue; }
            slot.className = 'mcd-slot';
            const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'mcd-remove'; remove.textContent = '×';
            remove.setAttribute('aria-label', `${marketText('Remove', '移除')} ${item.code}`);
            remove.addEventListener('click', () => { selected.splice(index, 1); refresh(); });
            slot.append(label(item, false), remove); slots.append(slot);
        }
        if (saveButton) saveButton.disabled = JSON.stringify(selected.map(key)) === saved;
        renderResults(lastResults);
    };
    const renderResults = (items: CustomInstrument[], emptyText?: string) => {
        if (!results) return;
        lastResults = items;
        results.replaceChildren();
        for (const item of items) {
            const row = document.createElement('li'); row.className = 'mcd-result';
            const add = document.createElement('button'); add.type = 'button'; add.className = 'mcd-add';
            const added = isSelected(item);
            add.textContent = added ? `✓ ${marketText('Added', '已加入')}` : `+ ${marketText('Add', '加入')}`;
            add.classList.toggle('is-added', added);
            add.disabled = added || selected.length >= CUSTOM_LIMIT;
            if (!added && selected.length >= CUSTOM_LIMIT) add.title = marketText('Remove one first (limit 5)', '已滿 5 檔，請先移除');
            add.addEventListener('click', () => { if (!isSelected(item) && selected.length < CUSTOM_LIMIT) { selected.push(item); refresh(); } });
            row.append(label(item, true), add); results.append(row);
        }
        if (!items.length && emptyText) { const empty = document.createElement('li'); empty.className = 'mcd-empty'; empty.textContent = emptyText; results.append(empty); }
    };
    const showRecent = async () => {
        if (heading) heading.textContent = marketText('Recently seen', '最近出現過');
        if (state) state.textContent = '';
        const response = await fetch(`${astroApiPath('/api/market/dashboard/candidates')}?q=`, { headers: marketAuthHeaders() }).catch(() => null);
        const payload = response?.ok ? await response.json() : { results: [] };
        if (input?.value.trim()) return; // the user started typing meanwhile
        renderResults((payload.results ?? []).slice(0, 30), marketText('Type a code or name to search.', '輸入代號或名稱開始搜尋。'));
    };
    const search = async (query: string) => {
        const seq = ++searchSeq;
        if (heading) heading.textContent = marketText('Search results', '搜尋結果');
        if (state) state.textContent = marketText('Searching…', '搜尋中…');
        if (error) error.textContent = '';
        const response = await fetch(`${astroApiPath('/api/market/dashboard/search')}?q=${encodeURIComponent(query)}`, { headers: marketAuthHeaders() }).catch(() => null);
        if (seq !== searchSeq) return; // a newer keystroke superseded this request
        if (!response?.ok) {
            if (state) state.textContent = '';
            renderResults([], marketText(`Search unavailable${response ? ` (HTTP ${response.status})` : ''}.`, `搜尋暫時無法使用${response ? `（HTTP ${response.status}）` : ''}。`));
            return;
        }
        const payload = await response.json();
        const items: CustomInstrument[] = payload.results ?? [];
        if (state) state.textContent = items.length ? marketText(`${items.length} found`, `${items.length} 筆`) : '';
        renderResults(items, marketText('No matching stock or futures contract.', '找不到符合的股票或期貨。'));
    };
    input?.addEventListener('input', () => {
        if (debounce !== null) window.clearTimeout(debounce);
        const query = input.value.trim();
        if (!query) { searchSeq++; void showRecent(); return; }
        debounce = window.setTimeout(() => { void search(query); }, 300);
    });
    input?.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        if (debounce !== null) window.clearTimeout(debounce);
        if (input.value.trim()) void search(input.value.trim());
    });
    button.addEventListener('click', async () => {
        const response = await fetch(astroApiPath('/api/market/dashboard/custom'), { headers: marketAuthHeaders() });
        if (!response.ok) { button.hidden = true; return; }
        const payload = await response.json();
        selected = payload.symbols ?? [];
        saved = JSON.stringify(selected.map(key));
        lastResults = [];
        if (input) { input.value = ''; input.placeholder = marketText('Code or name, e.g. 2330 or TSMC', '代號或名稱，例如 2330 或 台積電'); }
        if (error) error.textContent = '';
        refresh();
        dialog.showModal();
        input?.focus();
        void showRecent();
    });
    document.getElementById('market-custom-cancel')?.addEventListener('click', () => dialog.close());
    // Clicking the dimmed backdrop closes the dialog like the × button.
    dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
    saveButton?.addEventListener('click', async () => {
        saveButton.disabled = true;
        const response = await fetch(astroApiPath('/api/market/dashboard/custom'), {
            method: 'PUT', headers: { ...marketAuthHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ symbols: selected }),
        }).catch(() => null);
        if (!response?.ok) {
            if (error) error.textContent = marketText(`Save failed${response ? ` (HTTP ${response.status})` : ''}.`, `儲存失敗${response ? `（HTTP ${response.status}）` : ''}。`);
            saveButton.disabled = false;
            return;
        }
        dialog.close(); await fetchMarketDashboard();
    });
    void fetch(astroApiPath('/api/market/dashboard/custom'), { headers: marketAuthHeaders() }).then((response) => { if (response.ok) button.hidden = false; }).catch(() => undefined);
}

type PortfolioHistoryPoint = { date: string; valuedAt: string; totalAssets: number };

function renderPortfolioHistory(points: PortfolioHistoryPoint[]) {
    const svg = document.getElementById('portfolio-history-svg') as SVGSVGElement | null;
    const empty = document.getElementById('portfolio-history-empty');
    const status = document.getElementById('portfolio-history-status');
    if (!svg || !empty || !status) return;
    svg.replaceChildren();

    if (points.length === 0) {
        svg.classList.add('is-hidden');
        empty.hidden = false;
        empty.textContent = 'No daily portfolio history is available yet.';
        status.textContent = '0 days';
        return;
    }

    empty.hidden = true;
    svg.classList.remove('is-hidden');
    status.textContent = `${points.length} ${points.length === 1 ? 'day' : 'days'}`;
    const ns = 'http://www.w3.org/2000/svg';
    const make = (tag: string, attrs: Record<string, string>) => {
        const node = document.createElementNS(ns, tag);
        Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
        return node;
    };
    const width = 900;
    const height = 280;
    const pad = { top: 20, right: 28, bottom: 42, left: 92 };
    const values = points.map((point) => point.totalAssets);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const valueRange = maxValue - minValue || Math.max(maxValue * 0.05, 1);
    const low = minValue - valueRange * 0.12;
    const high = maxValue + valueRange * 0.12;
    const x = (index: number) => points.length === 1
        ? (pad.left + width - pad.right) / 2
        : pad.left + (index / (points.length - 1)) * (width - pad.left - pad.right);
    const y = (value: number) => pad.top + ((high - value) / (high - low)) * (height - pad.top - pad.bottom);
    const format = (value: number) => `NT$ ${Math.round(value).toLocaleString()}`;

    for (let tick = 0; tick < 4; tick += 1) {
        const value = low + ((high - low) * tick) / 3;
        const tickY = y(value);
        svg.append(make('line', { x1: String(pad.left), x2: String(width - pad.right), y1: String(tickY), y2: String(tickY), class: 'portfolio-history-gridline' }));
        const label = make('text', { x: String(pad.left - 10), y: String(tickY + 4), 'text-anchor': 'end', class: 'portfolio-history-axis-label' });
        label.textContent = compactNumber(value, 1);
        svg.append(label);
    }

    const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(index)} ${y(point.totalAssets)}`).join(' ');
    svg.append(make('path', { d: path, class: 'portfolio-history-line' }));
    points.forEach((point, index) => {
        const circle = make('circle', { cx: String(x(index)), cy: String(y(point.totalAssets)), r: '3.5', class: 'portfolio-history-point', tabindex: '0' });
        const date = new Date(`${point.date}T00:00:00`).toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' });
        const title = make('title', {});
        title.textContent = `${date} · ${format(point.totalAssets)}`;
        circle.append(title);
        svg.append(circle);
    });

    [...new Set([0, points.length - 1])].forEach((index) => {
        const anchor = points.length === 1 ? 'middle' : index === 0 ? 'start' : 'end';
        const label = make('text', { x: String(x(index)), y: String(height - 12), 'text-anchor': anchor, class: 'portfolio-history-axis-label' });
        label.textContent = new Date(`${points[index].date}T00:00:00`).toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' });
        svg.append(label);
    });
}

async function fetchPortfolioHistory() {
    const status = document.getElementById('portfolio-history-status');
    if (!status) return;
    if (!hasMarketAuth()) {
        renderPortfolioHistory([]);
        status.textContent = 'Login';
        return;
    }
    try {
        const response = await fetch(astroApiPath('/api/market/history'), { headers: marketAuthHeaders() });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json() as { history?: PortfolioHistoryPoint[] };
        renderPortfolioHistory(Array.isArray(payload.history) ? payload.history : []);
    } catch (error) {
        console.error('Error fetching daily portfolio history:', error);
        renderPortfolioHistory([]);
        status.textContent = 'Offline';
        const empty = document.getElementById('portfolio-history-empty');
        if (empty) empty.textContent = 'Daily portfolio history is temporarily unavailable.';
    }
}

// 定義提示文字（全域常量）
const shadeDescriptions: Record<string, string> = {
    shade1: "Score 5 Strong",
    shade2: "Score 4 Sufficient",
    shade3: "Score 3 Understood",
    shade4: "Score 2 Applicable",
    shade5: "Score 1 Basic",
};

// 分數映射（全域常量）
const shadeScores: Record<string, number> = {
    shade1: 5,
    shade2: 4,
    shade3: 3,
    shade4: 2,
    shade5: 1,
};

// 全域 tooltip 元素（只創建一次）
let globalTooltip: HTMLElement | null = null;

function getOrCreateTooltip(): HTMLElement {
    if (globalTooltip && document.body.contains(globalTooltip)) {
        return globalTooltip;
    }
    
    globalTooltip = document.createElement("div");
    globalTooltip.id = "global-pill-tooltip";
    globalTooltip.style.position = "absolute";
    globalTooltip.style.padding = "5px 10px";
    globalTooltip.style.backgroundColor = "#333";
    globalTooltip.style.color = "#fff";
    globalTooltip.style.borderRadius = "4px";
    globalTooltip.style.fontSize = "12px";
    globalTooltip.style.display = "none";
    globalTooltip.style.zIndex = "1000";
    globalTooltip.style.pointerEvents = "none";
    document.body.appendChild(globalTooltip);
    return globalTooltip;
}

function initTooltips() {
    const tooltip = getOrCreateTooltip();

    // 計算每個類別的總分數
    function calculateCategoryScores() {
        const categories = document.querySelectorAll('.category');
        
        categories.forEach((category) => {
            const pills = category.querySelectorAll('.skill-pill');
            let totalScore = 0;
            
            pills.forEach((pill) => {
                const shadeClass = [...pill.classList].find((cls) => cls.startsWith("shade"));
                if (shadeClass && shadeScores[shadeClass]) {
                    totalScore += shadeScores[shadeClass];
                }
            });
            
            // 找到類別標題
            const title = category.querySelector('h5');
            if (title && !title.dataset.scoreAdded) {
                // 添加總分 - 改為小字格式（標記已添加避免重複）
                title.innerHTML = `${title.textContent} <sup style="font-size: 0.65em; color: #888; margin-left: 4px;">${totalScore}</sup>`;
                title.dataset.scoreAdded = 'true';
            }
        });
    }

    // 處理 hover 事件
    const pills = document.querySelectorAll<HTMLElement>(".pill");
    pills.forEach((pill) => {
        // 避免重複綁定事件
        if (pill.dataset.tooltipBound) return;
        pill.dataset.tooltipBound = 'true';

        let tooltipTextValue: string | null = null;
        if (pill.hasAttribute('data-explanation')) {
            tooltipTextValue = pill.getAttribute('data-explanation');
        } else {
            const shadeClass = [...pill.classList].find((cls) => cls.startsWith("shade"));
            if (shadeClass && shadeDescriptions[shadeClass]) {
                tooltipTextValue = shadeDescriptions[shadeClass];
            }
        }

        if (tooltipTextValue !== null) {
            const finalTooltipText = tooltipTextValue; // Ensures non-null string for closure
            // 滑鼠進入
            pill.addEventListener("mouseenter", (e) => {
                tooltip.textContent = finalTooltipText;
                tooltip.style.display = "block";
                const target = e.target as HTMLElement;
                const rect = target.getBoundingClientRect();
                tooltip.style.left = `${rect.left + window.scrollX}px`;
                tooltip.style.top = `${rect.top + window.scrollY - tooltip.offsetHeight - 5}px`;
            });

            // 滑鼠移動
            pill.addEventListener("mousemove", (e) => {
                tooltip.style.left = `${e.pageX}px`;
                tooltip.style.top = `${e.pageY - tooltip.offsetHeight - 5}px`;
            });

            // 滑鼠離開
            pill.addEventListener("mouseleave", () => {
                tooltip.style.display = "none";
            });
        }
    });

    // 計算並顯示分數
    calculateCategoryScores();
}

// 監聽 View Transitions 事件（支援客戶端導航）
document.addEventListener('astro:page-load', initTooltips);
// 備用：首次載入時也觸發
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTooltips);
} else {
    initTooltips();
}

// HEX to RGB 顏色轉換
function hexToRgb(hex: string): { r: number, g: number, b: number } {
    const bigint = parseInt(hex.slice(1), 16);
    return {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255,
    };
}

// RGB to HSL 顏色轉換
function rgbToHsl(r: number, g: number, b: number): { h: number, s: number, l: number } {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;

    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (delta !== 0) {
        s = delta / (1 - Math.abs(2 * l - 1));
        switch (max) {
            case r:
                h = ((g - b) / delta + (g < b ? 6 : 0)) % 6;
                break;
            case g:
                h = (b - r) / delta + 2;
                break;
            case b:
                h = (r - g) / delta + 4;
                break;
        }
        h *= 60;
    }

    return { h, s: s * 100, l: l * 100 };
}

// HSL to HEX 顏色轉換
function hslToHex(h: number, s: number, l: number): string {
    s /= 100;
    l /= 100;

    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;

    let r = 0,
        g = 0,
        b = 0;

    if (h >= 0 && h < 60) {
        r = c;
        g = x;
        b = 0;
    } else if (h >= 60 && h < 120) {
        r = x;
        g = c;
        b = 0;
    } else if (h >= 120 && h < 180) {
        r = 0;
        g = c;
        b = x;
    } else if (h >= 180 && h < 240) {
        r = 0;
        g = x;
        b = c;
    } else if (h >= 240 && h < 300) {
        r = x;
        g = 0;
        b = c;
    } else if (h >= 300 && h < 360) {
        r = c;
        g = 0;
        b = x;
    }

    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);

    return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

// 調整顏色的函數 (從原色到黑色漸層)
function adjustColorToBlack(hex: string, shadeLevel: number): { r: number, g: number, b: number } {
    const rgb = hexToRgb(hex);
    
    // 計算漸層比例 (shade1 = 0%, shade5 = 100%)
    const factor = (shadeLevel - 1) / 4;
    
    // 將顏色向黑色漸變
    return {
        r: Math.round(rgb.r * (1 - factor)),
        g: Math.round(rgb.g * (1 - factor)),
        b: Math.round(rgb.b * (1 - factor))
    };
}

// 將 RGB 顏色轉為 HEX 的輔助函數
function rgbToHex(rgb: string): string {
    const match = rgb.match(/\d+/g);
    if (!match) throw new Error('Invalid RGB color');
    const [r, g, b] = match.map(Number);
    return (
        '#' +
        ((1 << 24) + (r << 16) + (g << 8) + b)
            .toString(16)
            .slice(1)
            .toUpperCase()
    );
}

// 初始化 shade 與 pill 顏色
const applyShadesToPills = () => {
    const pills = document.querySelectorAll<HTMLElement>('.pill');

    pills.forEach((pill) => {
        // 避免重複處理
        if (pill.dataset.shadeApplied) return;
        
        const baseColor = getComputedStyle(pill).backgroundColor;
        const shadeClass = [...pill.classList].find((cls) => cls.startsWith('shade'));
        if (shadeClass) {
            const shadeLevel = parseInt(shadeClass.replace('shade', ''), 10);
            const adjustedColor = adjustColorToBlack(rgbToHex(baseColor), shadeLevel);
            pill.style.backgroundColor = `rgb(${adjustedColor.r}, ${adjustedColor.g}, ${adjustedColor.b})`;
            pill.dataset.shadeApplied = 'true';
        }
    });
}

// applyShadesToPills 已經在 initTooltips 中被間接處理，但確保也支援 View Transitions
document.addEventListener('astro:page-load', applyShadesToPills);

interface ErrorData {
    detail?: {
        message?: string;
    };
    message?: string;
}

// LeetCode API Integration
async function fetchLeetCodeStats() {
    const username = 'Vinskao';
    try {
        // 使用 Maya Sawa 代理 API 来绕过 CORS 限制
        // 生产环境：https://peoplesystem.tatdvsonorth.com/maya-sawa/proxy/leetcode-stats/{username}
        // 本地开发：http://localhost:8000/maya-sawa/proxy/leetcode-stats/{username}
        const response = await fetch(`/maya-sawa/proxy/leetcode-stats/${username}`);
        
        // Proxy/backend 5xx means the optional local Maya Sawa chain is unavailable.
        if (response.status >= 500) {
            serviceAvailabilityManager.block(SERVICE_KEYS.LEETCODE);
            return;
        }

        // 检查响应状态
        if (!response.ok) {
            const errorData: ErrorData | unknown = await response.json().catch(() => ({ detail: { message: `HTTP ${response.status}` } }));
            const msg = (errorData as ErrorData).detail?.message || (errorData as any)?.detail || `HTTP ${response.status}`;
            throw new Error(msg);
        }

        const data = await response.json();
        serviceAvailabilityManager.unblock(SERVICE_KEYS.LEETCODE);
        
        // Update the stats in the DOM with null checks
        const totalSolved = document.getElementById('total-solved');
        const easySolved = document.getElementById('easy-solved');
        const mediumSolved = document.getElementById('medium-solved');
        const hardSolved = document.getElementById('hard-solved');
        
        const totalProgress = document.getElementById('total-progress');
        const easyProgress = document.getElementById('easy-progress');
        const mediumProgress = document.getElementById('medium-progress');
        const hardProgress = document.getElementById('hard-progress');
        
        if (totalSolved) totalSolved.textContent = data.totalSolved;
        if (easySolved) easySolved.textContent = data.easySolved;
        if (mediumSolved) mediumSolved.textContent = data.mediumSolved;
        if (hardSolved) hardSolved.textContent = data.hardSolved;
        
        // Update progress bars
        if (totalProgress) totalProgress.style.width = `${(data.totalSolved / 2000) * 100}%`;
        if (easyProgress) easyProgress.style.width = `${(data.easySolved / 1000) * 100}%`;
        if (mediumProgress) mediumProgress.style.width = `${(data.mediumSolved / 800) * 100}%`;
        if (hardProgress) hardProgress.style.width = `${(data.hardSolved / 200) * 100}%`;
        
        // Add some animation
        const cards = document.querySelectorAll<HTMLElement>('.leetcode-card');
        cards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            setTimeout(() => {
                card.style.transition = 'all 0.5s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 200);
        });
    } catch (error: any) {
        console.error('Error fetching LeetCode stats:', error);
        const leetcodeStats = document.getElementById('leetcode-stats');
        if (leetcodeStats) {
            // 使用后端返回的友好错误信息，或使用默认消息
            let errorMessage = error.message || 'Failed to load LeetCode stats';
            
            // 为常见错误提供更友好的消息
            if (errorMessage.includes('temporarily unavailable')) {
                errorMessage = '⏱️ ' + errorMessage;
            } else if (errorMessage.includes('timed out')) {
                errorMessage = '⏰ ' + errorMessage;
            } else if (!errorMessage.includes('LeetCode')) {
                errorMessage = 'Failed to load LeetCode stats: ' + errorMessage;
            }
            
            leetcodeStats.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <p style="color: var(--gray-300); margin-bottom: 0.5rem;">${errorMessage}</p>
                    <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: var(--accent-regular); color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Retry
                    </button>
                </div>
            `;
        }
    }
}

interface TxfQuote {
    symbol: string;
    underlyingCode?: string;
    quoteSource?: string;
    availability?: string;
    deliveryMonth?: string;
    close: number;
    open: number;
    high: number;
    low: number;
    change: number;
    changePercent: number;
    volume: number;
    timestamp?: string;
}

interface MarketUsage {
    connections: number;
    bytes: number;
    limitBytes: number;
    remainingBytes: number;
    usedMb: number;
    limitMb: number;
    remainingMb: number;
    fetchedAt: string;
    source: string;
}

const TXF_QUOTE_CACHE_KEY = 'market:txf-quote';
const MARKET_USAGE_CACHE_KEY = 'market:usage';
const PORTFOLIO_CACHE_KEY = 'market:portfolio';

const astroApiPath = (path: string) => {
    const base = import.meta.env.BASE_URL || '/';
    return `${base.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
};

// Usage refreshes server-side every ~10 min; treat data older than this as stale.
const MARKET_USAGE_STALE_MS = 30 * 60 * 1000;

/**
 * Returns true only when `fetchedAt` is missing/invalid or older than maxAgeMs.
 * Used so a reachable-but-unauthorised (HTTP 401) request that falls back to a
 * recent cached snapshot is NOT mislabelled "Offline" — only genuinely old or
 * absent data is. */
function isDataStale(fetchedAt: string | undefined, maxAgeMs: number): boolean {
    if (!fetchedAt) return true;
    const ts = new Date(fetchedAt).getTime();
    if (!Number.isFinite(ts)) return true;
    return Date.now() - ts > maxAgeMs;
}
const LEGACY_STOCK_NAMES: Record<string, string> = {
    '1785': '光洋科',
    '2313': '華通',
    '2327': '國巨*',
    '2344': '華邦電',
    '2368': '金像電',
    '2375': '凱美',
    '2408': '南亞科',
    '2472': '立隆電',
    '2478': '大毅',
    '2492': '華新科',
    '3008': '大立光',
    '3026': '禾伸堂',
    '3044': '健鼎',
    '3081': '聯亞',
    '3357': '臺慶科',
    '6173': '信昌電',
    '6213': '聯茂',
    '6274': '台燿',
    '6285': '啟碁',
    '6531': '愛普*',
};

function readCachedMarketData<T>(key: string): T | null {
    try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return null;
        const value = JSON.parse(raw) as T;
        if (key === PORTFOLIO_CACHE_KEY) {
            const portfolio = value as Portfolio;
            let migrated = false;
            portfolio.positions?.forEach((position) => {
                if (!position.name && LEGACY_STOCK_NAMES[position.code]) {
                    position.name = LEGACY_STOCK_NAMES[position.code];
                    migrated = true;
                }
            });
            if (migrated) {
                window.localStorage.setItem(key, JSON.stringify(portfolio));
            }
        }
        return value;
    } catch (error) {
        console.warn(`Failed to read cached market data for ${key}:`, error);
        return null;
    }
}

function writeCachedMarketData<T>(key: string, value: T) {
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.warn(`Failed to cache market data for ${key}:`, error);
    }
}

function marketAuthHeaders(): HeadersInit {
    // #4: token 不再從 URL 取，一律從 localStorage（canonical 來源）
    const token = window.localStorage.getItem('token')
        || window.localStorage.getItem('accessToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
}

function hasMarketAuth(): boolean {
    return Object.keys(marketAuthHeaders()).length > 0;
}

function clearPortfolioCache() {
    try {
        window.localStorage.removeItem(PORTFOLIO_CACHE_KEY);
    } catch (error) {
        console.warn('Failed to clear portfolio cache:', error);
    }
}

function adminOnlyMessage(): string {
    return (window as any).AppLang?.get?.() === 'zh'
        ? '此功能僅供管理員使用，請聯繫管理員。'
        : 'This feature is available to administrators. Please contact an administrator.';
}

function showAdminOnly(section: HTMLElement, statusId: string, messageId: string) {
    section.classList.remove('is-offline');
    const status = document.getElementById(statusId);
    if (status) status.textContent = '403';
    const message = document.getElementById(messageId);
    if (message) {
        message.textContent = adminOnlyMessage();
        message.hidden = false;
    }
}

function renderTxfQuote(quote: TxfQuote, offline = false) {
    const section = document.getElementById('txf-quote-section');
    if (!section) return;

    const formatNumber = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 2 });
    const setText = (id: string, value: string) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    };

    section.classList.toggle('is-offline', offline);
    setText('txf-price', formatNumber(quote.close));
    setText('txf-change', `${quote.change > 0 ? '+' : ''}${formatNumber(quote.change)} (${quote.changePercent > 0 ? '+' : ''}${quote.changePercent.toFixed(2)}%)`);
    setText('txf-market-status', offline ? 'Offline' : '10m');
    setText(
        'txf-updated',
        quote.timestamp
            ? new Date(quote.timestamp).toLocaleString()
            : new Date().toLocaleString(),
    );

    const change = document.getElementById('txf-change');
    change?.classList.toggle('up', quote.change > 0);
    change?.classList.toggle('down', quote.change < 0);
}

function renderMarketUsage(usage: MarketUsage, offline = false) {
    const section = document.getElementById('market-usage-section');
    if (!section) return;

    const setText = (id: string, value: string) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    };

    section.classList.toggle('is-offline', offline);
    const accessMessage = document.getElementById('market-usage-access-message');
    if (accessMessage) accessMessage.hidden = true;
    setText('market-usage-used', `${usage.usedMb.toFixed(1)} MB`);
    setText('market-usage-limit', `/ ${usage.limitMb.toFixed(0)} MB`);
    setText('market-usage-remaining', `${usage.remainingMb.toFixed(1)} MB`);
    setText('market-usage-connections', usage.connections.toString());
    setText('market-usage-updated', new Date(usage.fetchedAt).toLocaleTimeString());
    // source intentionally hidden
    setText('market-usage-status', offline ? 'Offline' : '10m');

    const progress = document.getElementById('market-usage-progress-bar');
    if (progress) {
        const usedRatio = usage.limitBytes > 0 ? Math.min((usage.bytes / usage.limitBytes) * 100, 100) : 0;
        progress.style.width = `${usedRatio}%`;
    }
}

function prettifyFormula(formula: string): string {
    // "(A + B + C) / (D + E + F)"  →  vertical fraction
    const formatGroup = (group: string): string => {
        const inner = group.trim().replace(/^\(|\)$/g, '').trim();
        const terms = inner.split(/\s*\+\s*/);
        if (terms.length <= 1) return group.trim();
        const [first, ...rest] = terms;
        return `( ${first}\n` + rest.map((t) => `+ ${t}`).join('\n') + ' )';
    };

    const parts = formula.split(' / ');
    if (parts.length === 2) {
        return `${formatGroup(parts[0])}\n÷\n${formatGroup(parts[1])}`;
    }
    return formula;
}

function renderPortfolio(portfolio: Portfolio, offline = false) {
    portfolio = taiwanPortfolio(portfolio);
    const section = document.getElementById('portfolio-section');
    if (!section) return;

    const currency = (value: number) => `NT$ ${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    const setSummaryTooltip = (valueId: string, tooltipId: string, formula: string | null | undefined) => {
        const valueEl = document.getElementById(valueId);
        const tooltipEl = document.getElementById(tooltipId);
        if (!valueEl || !tooltipEl) return;
        const content = formula?.trim() || 'Unavailable';
        tooltipEl.textContent = content;
        valueEl.setAttribute('aria-label', `${valueEl.textContent || ''}. Formula: ${content}`);
    };

    section.classList.toggle('is-offline', offline);
    const accessMessage = document.getElementById('portfolio-access-message');
    if (accessMessage) accessMessage.hidden = true;
    document.getElementById('portfolio-status')!.textContent = offline ? 'Offline' : '1h';
    document.getElementById('portfolio-cash')!.textContent = portfolio.cashBalance === null
        ? 'Unavailable'
        : currency(portfolio.cashBalance);
    document.getElementById('portfolio-total')!.textContent = portfolio.totalAssetsEstimated === null
        ? currency(portfolio.totalPositionExposure)
        : currency(portfolio.totalAssetsEstimated);
    document.getElementById('portfolio-updated')!.textContent = `${new Date(portfolio.fetchedAt).toLocaleString()} · ${portfolio.valuationNote}`;
    const totalPnl = portfolio.totalPnl ?? portfolio.positions.reduce((sum, position) => sum + position.pnl, 0);
    document.getElementById('portfolio-pnl')!.textContent = currency(totalPnl);
    document.getElementById('portfolio-pnl')!.className = totalPnl >= 0 ? 'up' : 'down';
    const leverage = document.getElementById('portfolio-leverage');
    if (leverage) {
        const totalLev = portfolio.regions?.total?.leverage ?? portfolio.leverageRatio;
        leverage.textContent = totalLev === null || totalLev === undefined
            ? 'Unavailable'
            : `${totalLev.toFixed(2)}x`;
    }
    setSummaryTooltip('portfolio-cash', 'portfolio-cash-tooltip', portfolio.summaryFormulas?.cashBalance);
    setSummaryTooltip('portfolio-total', 'portfolio-total-tooltip', portfolio.summaryFormulas?.totalAssetsEstimated);
    const futPos = portfolio.futuresPositions ?? portfolio.positions.filter((p) => p.productType === 'futures');
    const secPos = portfolio.positions.filter((p) => p.productType !== 'futures');
    const secPnl = secPos.reduce((s, p) => s + p.pnl, 0);
    const futPnl = futPos.reduce((s, p) => s + p.pnl, 0);
    const nbCurrency = (value: number) => {
        const sign = value > 0 ? '+' : value < 0 ? '-' : '';
        const amount = Math.abs(value).toLocaleString(undefined, { maximumFractionDigits: 0 });
        return `${sign}NT$ ${amount}`;
    };
    setSummaryTooltip('portfolio-pnl', 'portfolio-pnl-tooltip',
        `${marketText('Securities', '證券')}  ${nbCurrency(secPnl)}\n+ ${marketText('Futures', '期貨')}  ${nbCurrency(futPnl)}`
    );
    // Region split sub-lines (台 Taiwan · 外 Overseas) under Cash / Total / Leverage.
    const regions = portfolio.regions;
    const hasOverseas = !!regions && ((regions.overseas.totalAssets ?? 0) !== 0 || (regions.overseas.cash ?? 0) !== 0);

    // 合併槓桿的後端公式與台灣單區公式不同；tooltip 和小字都必須跟目前顯示值一致。
    const combinedLeverageFormula = hasOverseas && portfolio.ibkr && portfolio.totalAssetsEstimated
        ? `(${Math.round(portfolio.totalPositionExposure).toLocaleString()} + IBKR ${Math.round(portfolio.ibkr.twd.grossPositionValue).toLocaleString()}) / ${Math.round(portfolio.totalAssetsEstimated).toLocaleString()}`
        : portfolio.summaryFormulas?.leverageRatio;
    setSummaryTooltip('portfolio-leverage', 'portfolio-leverage-tooltip',
        combinedLeverageFormula ? prettifyFormula(combinedLeverageFormula) : undefined);

    const leverageFormulaNote = document.getElementById('portfolio-leverage-formula');
    const leverageLabel = document.getElementById('portfolio-leverage-label');
    const lang = (window as any).AppLang?.get?.() === 'zh' ? 'zh' : 'en';
    if (leverageFormulaNote) {
        const key = hasOverseas ? 'leverageFormulaCombined' : 'leverageFormulaTaiwan';
        const copy = i18nData.home[key];
        leverageFormulaNote.dataset.i18n = `home.${key}`;
        leverageFormulaNote.textContent = copy[lang];
    }
    if (leverageLabel) {
        const key = hasOverseas ? 'portfolioLeverageCombined' : 'portfolioLeverageTaiwan';
        const copy = i18nData.home[key];
        leverageLabel.dataset.i18n = `home.${key}`;
        leverageLabel.textContent = copy[lang];
    }
    const setSplit = (id: string, fmt: (r: RegionFigures) => string) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (regions && hasOverseas) {
            el.textContent = `${marketText('TW', '台')} ${fmt(regions.taiwan)} · ${marketText('Overseas', '外')} ${fmt(regions.overseas)}`;
            el.hidden = false;
        } else {
            el.hidden = true;
        }
    };
    const cur0 = (v: number | null) => v === null ? '—' : currency(v);
    const lev = (v: number | null) => v === null || v === undefined ? '—' : `${v.toFixed(2)}x`;
    setSplit('portfolio-cash-split', (r) => cur0(r.cash));
    setSplit('portfolio-total-split', (r) => cur0(r.totalAssets));
    const leverageSplit = document.getElementById('portfolio-leverage-split');
    const taiwanLeverage = document.getElementById('portfolio-leverage-taiwan');
    const overseasLeverage = document.getElementById('portfolio-leverage-overseas');
    if (leverageSplit && regions && hasOverseas) {
        if (taiwanLeverage) taiwanLeverage.textContent = lev(regions.taiwan.leverage);
        if (overseasLeverage) overseasLeverage.textContent = lev(regions.overseas.leverage);
        leverageSplit.hidden = false;
    } else if (leverageSplit) {
        leverageSplit.hidden = true;
    }
    renderPortfolioAllocation(portfolio);
}

function resetPortfolioDisplay(message = 'Login required to view account portfolio') {
    const section = document.getElementById('portfolio-section');
    if (!section) return;

    section.classList.remove('is-offline');
    const setText = (id: string, value: string) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    };

    setText('portfolio-status', 'Login');
    setText('portfolio-cash', '--');
    setText('portfolio-total', '--');
    setText('portfolio-pnl', '--');
    setText('portfolio-leverage', '--');
    ['portfolio-cash-split', 'portfolio-total-split'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) { el.textContent = ''; (el as HTMLElement).hidden = true; }
    });
    const leverageSplit = document.getElementById('portfolio-leverage-split');
    if (leverageSplit) leverageSplit.hidden = true;
    setText('portfolio-leverage-taiwan', '--');
    setText('portfolio-leverage-overseas', '--');
    setText('portfolio-position-count', '--');
    setText('portfolio-futures-count', '--');
    setText('portfolio-combined-count', '--');
    setText('portfolio-securities-value', '--');
    setText('portfolio-futures-equity', '--');
    setText('portfolio-updated', message);

    document.getElementById('portfolio-pnl')?.classList.remove('up', 'down');
    document.querySelectorAll('.portfolio-summary-tooltip').forEach((tooltip) => {
        tooltip.textContent = '';
        tooltip.classList.remove('is-visible');
    });
    const accessMessage = document.getElementById('portfolio-access-message');
    if (accessMessage) {
        accessMessage.textContent = '';
        accessMessage.hidden = true;
    }
    [
        'portfolio-donut-svg', 'portfolio-futures-donut-svg', 'portfolio-overseas-donut-svg',
        'portfolio-combined-tw-donut-svg', 'portfolio-combined-os-donut-svg', 'portfolio-combined-donut-svg',
    ].forEach((id) => {
        const svg = document.getElementById(id);
        if (svg) svg.innerHTML = '<circle class="portfolio-donut-track" cx="60" cy="60" r="46"></circle>';
    });
    [
        'portfolio-tooltip', 'portfolio-futures-tooltip', 'portfolio-overseas-tooltip',
        'portfolio-combined-tw-tooltip', 'portfolio-combined-os-tooltip', 'portfolio-combined-tooltip',
    ].forEach((id) => {
        document.getElementById(id)?.classList.remove('is-visible');
    });
    ['portfolio-overseas-count', 'portfolio-combined-tw-count', 'portfolio-combined-os-count'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.textContent = '--';
    });
    const overseasValue = document.getElementById('portfolio-overseas-value');
    if (overseasValue) overseasValue.textContent = '--';
    ['portfolio-overseas-section', 'portfolio-combined-os-wrap'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) (el as HTMLElement).hidden = true;
    });
}


type OverseasMeta = {
    name: string;
    assetClass: string;
    currency: string;
    quantity: number;
    averagePrice: number;
    lastPrice: number;
    marketValueNative: number;
    pnlNative: number;
    pnlTwd: number;
};
type DonutSlice = {
    key: string;
    code: string;
    value: number;
    position: PortfolioPosition | null;
    isFutures?: boolean;
    isOverseas?: boolean;
    overseas?: OverseasMeta;
};

function getAllocationValue(position: PortfolioPosition): number {
    return Math.abs(position.allocationValue ?? position.marketValue);
}

function buildPnlColorFns(profitableSlices: DonutSlice[], losingSlices: DonutSlice[]) {
    const maxProfitPnl = Math.max(...profitableSlices.map((s) => Math.abs(s.position?.pnl ?? 0)), 1);
    const maxLossPnl   = Math.max(...losingSlices.map((s)   => Math.abs(s.position?.pnl ?? 0)), 1);

    // Bigger absolute P/L → darker (lower lightness); near-zero → lighter
    const absLightness = (absPnl: number, maxPnl: number) => 76 - (absPnl / maxPnl) * 42;

    return (slice: DonutSlice) => {
        const position = slice.position;
        if (!position) return '#8b95a5';
        const l = position.pnl >= 0
            ? absLightness(Math.abs(position.pnl), maxProfitPnl)
            : absLightness(Math.abs(position.pnl), maxLossPnl);
        return position.pnl >= 0
            ? `hsl(4 78% ${l.toFixed(1)}%)`
            : `hsl(154 62% ${l.toFixed(1)}%)`;
    };
}

function renderDonut(
    svgEl: HTMLElement,
    tooltipEl: HTMLElement,
    countEl: HTMLElement | null,
    slices: DonutSlice[],
    total: number,
    colorFn: (slice: DonutSlice) => string,
    currency: (v: number) => string,
    ariaLabel: string,
) {
    if (countEl) countEl.textContent = String(slices.filter((s) => s.position).length);
    svgEl.setAttribute('aria-label', ariaLabel);
    svgEl.innerHTML = '<circle class="portfolio-donut-track" cx="60" cy="60" r="46"></circle>';
    let cursor = 0;
    const circumference = 2 * Math.PI * 46;

    const showTip = (slice: DonutSlice, pct: number) => {
        const pos = slice.position;
        if (!pos) {
            tooltipEl.innerHTML = `<strong>${marketText('Cash', '現金')} · ${pct.toFixed(2)}%</strong><span>${currency(slice.value)}</span>`;
        } else if (slice.isOverseas && slice.overseas) {
            const o = slice.overseas;
            const nativeFmt = (v: number) => v.toLocaleString(undefined, { maximumFractionDigits: 0 });
            tooltipEl.innerHTML = `<strong>${o.name || slice.code}</strong>
               <small>${slice.code} · ${o.assetClass} · ${pct.toFixed(2)}%</small>
               <span>${marketText('Qty', '數量')} ${o.quantity} · ${marketText('Cost', '成本')} ${nativeFmt(o.averagePrice)} · ${marketText('Last', '現價')} ${nativeFmt(o.lastPrice)}</span>
               <span>${marketText('Value', '市值')} ${o.currency} ${nativeFmt(o.marketValueNative)} · ${currency(slice.value)}</span>
               <b class="${o.pnlTwd > 0 ? 'up' : o.pnlTwd < 0 ? 'down' : ''}">${marketText('P/L', '損益')} ${o.pnlTwd > 0 ? '+' : ''}${currency(o.pnlTwd)}</b>`;
        } else if (slice.isFutures) {
            tooltipEl.innerHTML = `<strong>${pos.name || pos.code}</strong>
               <small>${pos.code} · ${pct.toFixed(2)}%</small>
               <span>${pos.direction} · ${marketText('Net', '淨口數')} ${pos.signedQuantity > 0 ? '+' : ''}${pos.signedQuantity}</span>
               <span>${marketText('Cost', '成本')} ${pos.averagePrice.toLocaleString()} · ${marketText('Last', '現價')} ${pos.lastPrice.toLocaleString()}</span>
               <span>${marketText('Exposure', '分子')} ${currency(slice.value)} / ${marketText('Total', '分母')} ${currency(total)}</span>
               <b class="${pos.pnl > 0 ? 'up' : pos.pnl < 0 ? 'down' : ''}">${marketText('P/L', '損益')} ${pos.pnl > 0 ? '+' : ''}${currency(pos.pnl)}</b>`;
        } else {
            tooltipEl.innerHTML = `<strong>${pos.name || pos.code}</strong>
               <small>${pos.code} · ${pct.toFixed(2)}%</small>
               <span>${pos.quantity} ${marketText('shares', '股')} · ${marketText('Prev. day', '昨日')} ${pos.ydQuantity ?? 0}</span>
               <span>${marketText('Cost', '成本')} ${pos.averagePrice.toLocaleString()} · ${marketText('Last', '現價')} ${pos.lastPrice.toLocaleString()}</span>
               <span>Value ${currency(pos.marketValue)}</span>
               <b class="${pos.pnl > 0 ? 'up' : pos.pnl < 0 ? 'down' : ''}">${marketText('P/L', '損益')} ${pos.pnl > 0 ? '+' : ''}${currency(pos.pnl)}</b>`;
        }
        tooltipEl.classList.add('is-visible');
    };

    slices.forEach((slice) => {
        const pct = total > 0 ? (slice.value / total) * 100 : 0;
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('class', 'portfolio-donut-slice');
        circle.setAttribute('cx', '60');
        circle.setAttribute('cy', '60');
        circle.setAttribute('r', '46');
        circle.setAttribute('stroke', colorFn(slice));
        circle.setAttribute('stroke-dasharray', `${circumference * pct / 100} ${circumference}`);
        circle.setAttribute('stroke-dashoffset', `${-circumference * cursor / 100}`);
        circle.setAttribute('tabindex', '0');
        circle.setAttribute('role', 'button');
        circle.setAttribute('aria-label', `${slice.code}, ${pct.toFixed(2)} percent`);
        circle.addEventListener('pointerenter', () => showTip(slice, pct));
        circle.addEventListener('focus', () => showTip(slice, pct));
        circle.addEventListener('click', () => showTip(slice, pct));
        circle.addEventListener('pointerleave', () => tooltipEl.classList.remove('is-visible'));
        circle.addEventListener('blur', () => tooltipEl.classList.remove('is-visible'));
        svgEl.appendChild(circle);
        cursor += pct;
    });
}

function renderPortfolioAllocation(portfolio: Portfolio) {
    const currency = (value: number) => `NT$ ${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    const stockPositions = portfolio.stockPositions ?? portfolio.positions.filter((p) => p.productType === 'stock');
    const futuresPositions = portfolio.futuresPositions ?? portfolio.positions.filter((p) => p.productType === 'futures');

    // Build stock slices
    const profitableStock: DonutSlice[] = stockPositions
        .filter((p) => p.pnl >= 0 && getAllocationValue(p) > 0)
        .map((p, index) => ({ key: `stock:profit:${p.code}:${index}`, code: p.code, value: getAllocationValue(p), position: p }))
        .sort((a, b) => Math.abs(b.position!.pnl) - Math.abs(a.position!.pnl));
    const losingStock: DonutSlice[] = stockPositions
        .filter((p) => p.pnl < 0 && getAllocationValue(p) > 0)
        .map((p, index) => ({ key: `stock:loss:${p.code}:${index}`, code: p.code, value: getAllocationValue(p), position: p }))
        .sort((a, b) => Math.abs(a.position!.pnl) - Math.abs(b.position!.pnl));
    const stockSlices: DonutSlice[] = [...profitableStock, ...losingStock];
    const stockTotal = stockSlices.reduce((sum, slice) => sum + slice.value, 0);

    // Build futures slices
    const profitableFut: DonutSlice[] = futuresPositions
        .map((p, index) => ({ key: `futures:${p.code}:${index}`, code: p.code, value: getAllocationValue(p), position: p, isFutures: true }))
        .filter((slice) => slice.position!.pnl >= 0 && slice.value > 0)
        .sort((a, b) => Math.abs(b.position!.pnl) - Math.abs(a.position!.pnl));
    const losingFut: DonutSlice[] = futuresPositions
        .map((p, index) => ({ key: `futures:${p.code}:${index}`, code: p.code, value: getAllocationValue(p), position: p, isFutures: true }))
        .filter((slice) => slice.position!.pnl < 0 && slice.value > 0)
        .sort((a, b) => Math.abs(a.position!.pnl) - Math.abs(b.position!.pnl));
    const futuresSlices: DonutSlice[] = [...profitableFut, ...losingFut];

    // Build 海外 (IBKR) slices, converted to NT$. The merge already folded IBKR
    // cash into portfolio.cashBalance, so recover the Taiwan-only cash here.
    const ibkrCashTwd = portfolio.ibkr?.twd.cashBalance ?? 0;
    const overseasPositions = portfolio.ibkr?.positions ?? [];
    const toOverseasSlice = (p: NonNullable<Portfolio['ibkr']>['positions'][number], index: number): DonutSlice => ({
        key: `os:${p.code}:${index}`,
        code: p.code,
        value: Math.abs(p.marketValueTwd),
        position: { pnl: p.pnlTwd } as PortfolioPosition, // only .pnl is read (color)
        isOverseas: true,
        overseas: {
            name: p.name,
            assetClass: p.assetClass,
            currency: p.currency,
            quantity: p.quantity,
            averagePrice: p.averagePrice,
            lastPrice: p.lastPrice,
            marketValueNative: p.marketValue,
            pnlNative: p.pnl,
            pnlTwd: p.pnlTwd,
        },
    });
    const profitableOs: DonutSlice[] = overseasPositions
        .filter((p) => p.pnlTwd >= 0 && Math.abs(p.marketValueTwd) > 0)
        .map(toOverseasSlice)
        .sort((a, b) => Math.abs(b.position!.pnl) - Math.abs(a.position!.pnl));
    const losingOs: DonutSlice[] = overseasPositions
        .filter((p) => p.pnlTwd < 0 && Math.abs(p.marketValueTwd) > 0)
        .map(toOverseasSlice)
        .sort((a, b) => Math.abs(a.position!.pnl) - Math.abs(b.position!.pnl));
    const overseasSlices: DonutSlice[] = [...profitableOs, ...losingOs];
    const overseasTotal = overseasSlices.reduce((s, sl) => s + sl.value, 0);

    const twCash = Math.max((portfolio.cashBalance ?? 0) - ibkrCashTwd, 0);
    const twCashSlices: DonutSlice[] = twCash > 0
        ? [{ key: 'tw-cash', code: 'Cash', value: twCash, position: null }]
        : [];
    const osCashSlices: DonutSlice[] = ibkrCashTwd > 0
        ? [{ key: 'os-cash', code: 'Cash', value: ibkrCashTwd, position: null }]
        : [];

    // Combined views: 台灣 / 海外 / 全部
    const twCombinedSlices: DonutSlice[] = [...twCashSlices, ...stockSlices, ...futuresSlices];
    const osCombinedSlices: DonutSlice[] = [...osCashSlices, ...overseasSlices];
    const allCombinedSlices: DonutSlice[] = [...twCombinedSlices, ...osCombinedSlices];
    const sumValues = (slices: DonutSlice[]) => slices.reduce((s, sl) => s + sl.value, 0);

    // Shared P/L color function across all donut views (all values are NT$).
    const colorFn = buildPnlColorFns(
        [...profitableStock, ...profitableFut, ...profitableOs],
        [...losingStock, ...losingFut, ...losingOs],
    );

    const drawDonut = (svgId: string, tipId: string, countId: string | null, slices: DonutSlice[], total: number, aria: string) => {
        const svg = document.getElementById(svgId);
        const tip = document.getElementById(tipId);
        const count = countId ? document.getElementById(countId) : null;
        if (svg && tip) renderDonut(svg, tip, count, slices, total, colorFn, currency, aria);
    };

    // 台灣 Securities donut
    drawDonut('portfolio-donut-svg', 'portfolio-tooltip', 'portfolio-position-count', stockSlices, stockTotal, `${stockPositions.length} stock positions`);
    const securitiesValueEl = document.getElementById('portfolio-securities-value');
    if (securitiesValueEl) securitiesValueEl.textContent = currency(portfolio.stockMarketValue ?? stockTotal);

    // 台灣 Futures donut
    const futuresTotal = sumValues(futuresSlices);
    drawDonut('portfolio-futures-donut-svg', 'portfolio-futures-tooltip', 'portfolio-futures-count', futuresSlices, futuresTotal, `${futuresPositions.length} futures positions`);
    const futuresEquityEl = document.getElementById('portfolio-futures-equity');
    if (futuresEquityEl) {
        const eq = portfolio.futuresEquity ?? portfolio.futuresSummary?.equity;
        futuresEquityEl.textContent = eq !== undefined ? currency(eq) : '--';
    }

    // 海外 (IBKR) donut — hide the whole region when there are no overseas holdings
    const hasOverseas = overseasSlices.length > 0 || ibkrCashTwd > 0;
    const overseasSection = document.getElementById('portfolio-overseas-section');
    const overseasCombinedWrap = document.getElementById('portfolio-combined-os-wrap');
    if (overseasSection) overseasSection.hidden = !hasOverseas;
    if (overseasCombinedWrap) overseasCombinedWrap.hidden = !hasOverseas;
    if (hasOverseas) {
        drawDonut('portfolio-overseas-donut-svg', 'portfolio-overseas-tooltip', 'portfolio-overseas-count', overseasSlices, overseasTotal, `${overseasSlices.length} overseas positions`);
        const overseasValueEl = document.getElementById('portfolio-overseas-value');
        if (overseasValueEl) overseasValueEl.textContent = currency(portfolio.ibkr?.twd.netLiquidation ?? overseasTotal);
        drawDonut('portfolio-combined-os-donut-svg', 'portfolio-combined-os-tooltip', 'portfolio-combined-os-count', osCombinedSlices, sumValues(osCombinedSlices), `${osCombinedSlices.length} overseas combined`);
    }

    // Combined 台灣
    drawDonut('portfolio-combined-tw-donut-svg', 'portfolio-combined-tw-tooltip', 'portfolio-combined-tw-count', twCombinedSlices, sumValues(twCombinedSlices), `${twCombinedSlices.length} Taiwan combined`);

    // Combined 全部
    const combinedCount = document.getElementById('portfolio-combined-count');
    if (combinedCount) combinedCount.textContent = String(stockPositions.length + futuresPositions.length + overseasSlices.length);
    drawDonut('portfolio-combined-donut-svg', 'portfolio-combined-tooltip', null, allCombinedSlices, sumValues(allCombinedSlices), `${allCombinedSlices.length} total positions`);
}

async function fetchTxfQuote() {
    const section = document.getElementById('txf-quote-section');
    if (!section) return;
    const cachedQuote = readCachedMarketData<TxfQuote>(TXF_QUOTE_CACHE_KEY);
    const showOffline = () => {
        if (cachedQuote) {
            renderTxfQuote(cachedQuote, true);
        } else {
            section.classList.add('is-offline');
            const status = document.getElementById('txf-market-status');
            if (status) status.textContent = 'Offline';
            const updated = document.getElementById('txf-updated');
            if (updated && updated.textContent === 'Loading...') {
                updated.textContent = 'Market data temporarily unavailable';
            }
        }
    };

    try {
        const response = await fetch('/maya-sawa/market/taiex-futures');
        if (!response.ok) {
            showOffline();
            return;
        }

        const quote: TxfQuote = await response.json();
        writeCachedMarketData(TXF_QUOTE_CACHE_KEY, quote);
        renderTxfQuote(quote);
    } catch (error) {
        console.error('Error fetching TXF quote:', error);
        showOffline();
    }
}

async function fetchMarketUsage() {
    const section = document.getElementById('market-usage-section');
    if (!section) return;
    const cachedUsage = readCachedMarketData<MarketUsage>(MARKET_USAGE_CACHE_KEY);
    const showOffline = () => {
        if (cachedUsage) {
            // The endpoint is reachable but this request failed. Only flag offline if the cached snapshot is actually stale.
            renderMarketUsage(cachedUsage, isDataStale(cachedUsage.fetchedAt, MARKET_USAGE_STALE_MS));
        } else {
            section.classList.add('is-offline');
            const status = document.getElementById('market-usage-status');
            if (status) status.textContent = 'Offline';
        }
    };

    try {
        const response = await fetch(astroApiPath('/api/market/usage'));
        if (!response.ok) {
            showOffline();
            return;
        }

        const usage: MarketUsage = await response.json();
        writeCachedMarketData(MARKET_USAGE_CACHE_KEY, usage);
        renderMarketUsage(usage);
    } catch (error) {
        console.error('Error fetching market usage:', error);
        showOffline();
    }
}

async function fetchPortfolio() {
    const section = document.getElementById('portfolio-section');
    if (!section) return;
    if (!hasMarketAuth()) {
        clearPortfolioCache();
        resetPortfolioDisplay();
        await fetchPortfolioHistory();
        return;
    }
    const cachedPortfolio = readCachedMarketData<Portfolio>(PORTFOLIO_CACHE_KEY);
    try {
        const response = await fetch(astroApiPath('/api/market/portfolio'), {
            headers: marketAuthHeaders(),
        });
        if (!response.ok) {
            let detail = '';
            try {
                const body = await response.json();
                detail = body?.error?.message || body?.detail?.message || body?.detail || '';
            } catch {
                // Keep the HTTP status when the response body is not JSON.
            }
            throw new Error(`HTTP ${response.status}${detail ? `: ${detail}` : ''}`);
        }
        const portfolio: Portfolio = await response.json();
        writeCachedMarketData(PORTFOLIO_CACHE_KEY, portfolio);
        renderPortfolio(portfolio);
    } catch (error) {
        console.error('Error fetching portfolio:', error);
        if (cachedPortfolio) renderPortfolio(cachedPortfolio, true);
        else {
            section.classList.add('is-offline');
            const status = document.getElementById('portfolio-status');
            if (status) status.textContent = 'Offline';
            const updated = document.getElementById('portfolio-updated');
            if (updated) {
                const message = error instanceof Error ? error.message : 'Portfolio unavailable';
                updated.textContent = `${message} · Portfolio data unavailable`;
            }
        }
    }
    // The portfolio endpoint persists today's valid snapshot before it returns;
    // load history only after that write has completed to avoid an empty-day race.
    await fetchPortfolioHistory();
    await fetchMarketDashboard();
}

// Call the function when the page loads - 支援 View Transitions
function initIndexPage() {
    // 檢查是否在首頁，避免在其他頁面執行
    const isIndexPage = window.location.pathname === '/tymultiverse/' ||
                        window.location.pathname === '/tymultiverse' ||
                        window.location.pathname === '/' ||
                        window.location.pathname.endsWith('/index.html');

    if (!isIndexPage) return;
    const marketRoot = document.getElementById('market-overview');
    if (!marketRoot || marketRoot.dataset.marketInitialized === 'true') return;
    marketRoot.dataset.marketInitialized = 'true';

    // 登記各服務的健康檢查端點（idempotent）
    const apiBaseUrl = import.meta.env.PUBLIC_API_BASE_URL || 'https://peoplesystem.tatdvsonorth.com';
    serviceAvailabilityManager.register(SERVICE_KEYS.LEETCODE,  `/maya-sawa/proxy/leetcode-stats/Vinskao`);
    serviceAvailabilityManager.register(SERVICE_KEYS.BACKEND,   `${config.api.backendUrl || apiBaseUrl + '/tymb'}/actuator/health`);
    serviceAvailabilityManager.register(SERVICE_KEYS.GATEWAY,   `${config.api.gatewayUrl || apiBaseUrl + '/tymg'}/tymg/actuator/health`);
    serviceAvailabilityManager.register(SERVICE_KEYS.MAYA_SAWA, `${config.api.mayaSawaUrl || apiBaseUrl + '/maya-sawa'}/health`);

    // LeetCode 區塊：依 flag 決定顯示/隱藏
    const leetcodeSection = document.querySelector('.leetcode-graph') as HTMLElement | null;
    const setLeetcodeVisible = (v: boolean) => { if (leetcodeSection) leetcodeSection.style.display = v ? '' : 'none'; };

    setLeetcodeVisible(true);

    // 清除上一次的監聽，避免 View Transitions 重複累積
    if (_leetcodeAvailabilityCleanup) _leetcodeAvailabilityCleanup();
    _leetcodeAvailabilityCleanup = serviceAvailabilityManager.onChange(SERVICE_KEYS.LEETCODE, setLeetcodeVisible);

    // Always retry on page load so stale local availability state cannot keep this section hidden.
    initMarketWatchlist();
    initMarketAiAnalysis();
    initMacroCommentary();
    initMarketCustomEditor();
    void fetchMarketDashboard();
    void fetchMacroDashboard();
    void loadMacroCommentary();
    fetchLeetCodeStats();
    fetchTxfQuote();
    fetchMarketUsage();
    fetchPortfolio();
    if (_marketQuoteTimer !== null) window.clearInterval(_marketQuoteTimer);
    _marketQuoteTimer = window.setInterval(() => {
        fetchTxfQuote();
        fetchMarketUsage();
    }, 600_000);
    if (_marketEventsTimer !== null) window.clearInterval(_marketEventsTimer);
    _marketEventsTimer = window.setInterval(() => { void fetchMarketCompanyEvents(); }, 600_000);
    if (_macroRefreshTimer !== null) window.clearInterval(_macroRefreshTimer);
    _macroRefreshTimer = window.setInterval(() => { void fetchMacroDashboard(); }, 900_000);
    if (_portfolioTimer !== null) window.clearInterval(_portfolioTimer);
    _portfolioTimer = window.setInterval(fetchPortfolio, 3_600_000);
    if (_marketLangCleanup) _marketLangCleanup();
    _marketLangCleanup = (window as any).AppLang?.onChange?.(refreshMarketLanguage) ?? null;
}

// Charts, tiles and tooltips are drawn by JS with the language at render time; redraw them on a switch.
function refreshMarketLanguage() {
    if (selectedMarketInstrument) {
        renderMarketDetailHeader(selectedMarketInstrument);
        const current = document.querySelector<HTMLButtonElement>('[data-market-tab][aria-selected="true"]')?.dataset.marketTab || 'price';
        selectMarketDetailTab(current);
    }
    void fetchMarketDashboard();
    void fetchMacroDashboard();
    fetchTxfQuote();
    fetchMarketUsage();
    fetchPortfolio();
}

// 監聽 View Transitions 事件
document.addEventListener('astro:page-load', initIndexPage);
// Initialize the market as soon as its DOM exists; slow third-party images or
// iframes must not keep the watchlist/editor waiting for the page-load event.
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initIndexPage, { once: true });
else initIndexPage();
