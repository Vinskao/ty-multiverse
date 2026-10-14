import type { Portfolio, PortfolioPosition, RegionFigures } from '../types/portfolio';
import { taiwanPortfolio } from '../services/core/taiwanPortfolio';
// 加上tooltip
// 使用 astro:page-load 來支援 View Transitions 的客戶端導航
import { serviceAvailabilityManager } from '../services/core/serviceAvailabilityManager';
import { SERVICE_KEYS } from '../common/constants/serviceKeys';
import { config } from '../services/core/config';
import i18nData from '../storages/i18n.json';

let _leetcodeAvailabilityCleanup: (() => void) | null = null;
let _marketQuoteTimer: number | null = null;
let _portfolioTimer: number | null = null;
let selectedMarketInstrument: DashboardInstrument | null = null;
const marketHistoryCache = new Map<string, { payload: MarketHistoryPayload; fetchedAt: number }>();
const MARKET_HISTORY_CACHE_TTL_MS = 5 * 60 * 1000;

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
        }
    });
    document.querySelectorAll<HTMLButtonElement>('[data-market-tab]').forEach((tab) => {
        tab.addEventListener('click', () => { if (!tab.disabled) selectMarketDetailTab(tab.dataset.marketTab || 'price'); });
    });
}

interface DashboardInstrument {
    code: string; name: string; productType: 'stock' | 'futures';
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

function historyValue(point: MarketHistoryPoint, sourceKeys: string[], field: string): number | null {
    for (const source of sourceKeys) {
        const value = point.sources[source]?.[field];
        if (typeof value === 'number') return value;
    }
    return null;
}

function drawMarketHistoryChart(targetId: string, points: MarketHistoryPoint[], fields: { label: string; color: string; sourceKeys: string[]; field: string; tooltip?: (point: MarketHistoryPoint, value: number) => string }[], bars = false, axes: { x?: string; y?: string } = {}) {
    const target = document.getElementById(targetId);
    if (!target) return;
    target.replaceChildren();
    const series = fields.map((field) => ({ ...field, values: points.map((point) => historyValue(point, field.sourceKeys, field.field)) }));
    const values = series.flatMap((item) => item.values.filter((value): value is number => value !== null));
    if (!points.length || !values.length) { target.textContent = marketI18n('marketHistoryNoRows', 'Historical data is not available yet.'); return; }
    const ns = 'http://www.w3.org/2000/svg'; const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 900 280'); svg.classList.add('market-history-chart');
    let low = bars ? Math.min(0, ...values) : Math.min(...values); let high = bars ? Math.max(0, ...values) : Math.max(...values);
    const span = high - low || Math.max(Math.abs(high) * .05, 1);
    if (!bars) { low -= span * .08; high += span * .08; }
    else if (high === low) high = low + 1;
    const padX = 64; const right = 888; const plotTop = 24; const plotBottom = 226;
    const x = (i: number) => padX + (points.length < 2 ? 0 : i / (points.length - 1)) * (right - padX);
    const y = (v: number) => plotTop + ((high - v) / (high - low)) * (plotBottom - plotTop);
    for (let tick = 0; tick <= 4; tick++) {
        const value = high - ((high - low) * tick / 4); const tickY = y(value);
        const grid = document.createElementNS(ns, 'line'); grid.setAttribute('x1', String(padX)); grid.setAttribute('x2', String(right));
        grid.setAttribute('y1', String(tickY)); grid.setAttribute('y2', String(tickY)); grid.classList.add('market-history-grid'); svg.append(grid);
        const label = document.createElementNS(ns, 'text'); label.setAttribute('x', String(padX - 8)); label.setAttribute('y', String(tickY + 4));
        label.setAttribute('text-anchor', 'end'); label.classList.add('market-history-axis-label');
        label.textContent = value.toLocaleString(undefined, { maximumFractionDigits: 1 }); svg.append(label);
    }
    const tickCount = Math.min(6, points.length);
    for (let tick = 0; tick < tickCount; tick++) {
        const index = Math.round(tick * (points.length - 1) / Math.max(tickCount - 1, 1));
        const label = document.createElementNS(ns, 'text'); label.setAttribute('x', String(x(index))); label.setAttribute('y', '248');
        label.setAttribute('text-anchor', tick === 0 ? 'start' : tick === tickCount - 1 ? 'end' : 'middle'); label.classList.add('market-history-axis-label');
        label.textContent = points[index].date; svg.append(label);
    }
    const xTitle = document.createElementNS(ns, 'text'); xTitle.setAttribute('x', String((padX + right) / 2)); xTitle.setAttribute('y', '274');
    xTitle.setAttribute('text-anchor', 'middle'); xTitle.classList.add('market-history-axis-title');
    xTitle.textContent = axes.x || marketI18n('marketHistoryDate', 'Date'); svg.append(xTitle);
    const yTitle = document.createElementNS(ns, 'text'); yTitle.setAttribute('x', '14'); yTitle.setAttribute('y', String((plotTop + plotBottom) / 2));
    yTitle.setAttribute('text-anchor', 'middle'); yTitle.setAttribute('transform', `rotate(-90 14 ${(plotTop + plotBottom) / 2})`);
    yTitle.classList.add('market-history-axis-title'); yTitle.textContent = axes.y || fields.map((field) => field.label).join(' / '); svg.append(yTitle);
    if (low <= 0 && high >= 0) {
        const zero = document.createElementNS(ns, 'line'); zero.setAttribute('x1', String(padX)); zero.setAttribute('x2', String(right));
        zero.setAttribute('y1', String(y(0))); zero.setAttribute('y2', String(y(0))); zero.classList.add('market-history-zero'); svg.append(zero);
    }
    series.forEach((item, si) => {
        if (bars) {
            const step = (900 - padX - 12) / Math.max(points.length, 1); const w = Math.max(1, Math.min(7, step / (series.length + 1)));
            item.values.forEach((v, i) => { if (v === null) return; const rect = document.createElementNS(ns, 'rect');
                rect.setAttribute('x', String(x(i) - w * series.length / 2 + si * w)); rect.setAttribute('y', String(Math.min(y(0), y(v))));
                rect.setAttribute('width', String(w * .8)); rect.setAttribute('height', String(Math.max(1, Math.abs(y(0) - y(v))))); rect.setAttribute('fill', item.color);
                const tooltip = document.createElementNS(ns, 'title');
                tooltip.textContent = `${points[i].date}\n${series.map((entry) => {
                    const value = entry.values[i];
                    return `${entry.label}: ${value === null ? '—' : (entry.tooltip?.(points[i], value) || value.toLocaleString())}`;
                }).join('\n')}`;
                rect.append(tooltip); svg.append(rect); });
        } else {
            let d = ''; item.values.forEach((v, i) => { if (v !== null) d += `${d ? ' L' : 'M'} ${x(i)} ${y(v)}`; });
            if (d) { const path = document.createElementNS(ns, 'path'); path.setAttribute('d', d); path.setAttribute('stroke', item.color); path.classList.add('market-history-line'); svg.append(path); }
            item.values.forEach((value, i) => {
                if (value === null) return;
                const point = document.createElementNS(ns, 'circle'); point.setAttribute('cx', String(x(i)));
                point.setAttribute('cy', String(y(value))); point.setAttribute('r', '5'); point.setAttribute('fill', 'transparent');
                point.setAttribute('pointer-events', 'all');
                const tooltip = document.createElementNS(ns, 'title');
                tooltip.textContent = `${points[i].date}\n${item.label}: ${item.tooltip?.(points[i], value) || value.toLocaleString()}`;
                point.append(tooltip); svg.append(point);
            });
        }
    });
    target.append(svg);
    const legend = document.createElement('div'); legend.className = 'market-history-legend';
    series.forEach((item) => { const label = document.createElement('span'); const dot = document.createElement('i'); dot.style.background = item.color; label.append(dot, document.createTextNode(item.label)); legend.append(label); });
    target.append(legend);
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
    svg.setAttribute('viewBox', '0 0 900 370'); svg.classList.add('market-history-chart');
    const valid = candles.filter((item): item is NonNullable<typeof item> => item !== null);
    let low = Math.min(...valid.map((item) => item.low)); let high = Math.max(...valid.map((item) => item.high));
    const priceSpan = high - low || Math.max(Math.abs(high) * .05, 1); low -= priceSpan * .04; high += priceSpan * .04;
    const maxVolume = Math.max(...valid.map((item) => item.volume || 0), 1);
    const left = 48; const right = 890; const priceTop = 16; const priceBottom = 230; const volumeTop = 258; const volumeBottom = 310;
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
    const tickCount = Math.min(5, candles.length);
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
        const rect = svg.getBoundingClientRect(); const viewX = ((clientX - rect.left) / rect.width) * 900;
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
                readout.textContent = `${first.date} ${formatPrice(first.close)} → ${last.date} ${formatPrice(last.close)} · ${marketI18n('marketHistoryRangeChange', 'Close change')} ${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
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

async function loadMarketHistory(instrument: DashboardInstrument, selectedTab = 'price') {
    if (instrument.productType !== 'stock' && instrument.productType !== 'futures') return;
    const status = document.getElementById('market-history-status'); if (status) status.textContent = marketI18n('marketHistoryLoading', 'Loading history…');
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
            marketHistoryCache.set(cacheKey, { payload, fetchedAt: Date.now() });
        }
        const historyLabel = instrument.productType === 'futures'
            ? `${historyCode} ${usesSpotHistory ? marketI18n('marketHistorySpotData', 'spot data') : marketI18n('marketHistoryFuturesData', 'TAIFEX futures data')} · ` : '';
        const points = payload.points ?? []; if (status) status.textContent = points.length
            ? `${historyLabel}${marketI18n('marketHistoryLoadedCount', '{count} daily records · {first} — {last}').replace('{count}', String(points.length)).replace('{first}', points[0].date).replace('{last}', points[points.length - 1].date)}`
            : `${historyLabel}${marketI18n('marketHistoryNoStored', 'No stored history yet; initial collection may take a few minutes.')}`;
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
            ], true);
            const institutionalDescription = document.getElementById('market-history-institutional-description');
            if (institutionalDescription) institutionalDescription.textContent = marketI18n('marketHistoryTaifexAggregateDescription', 'TAIFEX participant totals for the futures product category; not contract-specific positions.');
            const notAvailable = marketI18n('marketHistorySpotDataUnavailable', 'This panel requires an underlying stock ticker and is unavailable for index futures.');
            for (const id of [
                'market-history-margin-chart', 'market-history-margin-flow-chart',
                'market-history-borrow-chart', 'market-history-borrow-flow-chart',
                'market-history-foreign-holding-chart', 'market-history-foreign-holding-shares-chart',
                'market-history-foreign-limit-chart', 'market-history-ownership',
            ]) {
                const target = document.getElementById(id); if (target) target.textContent = notAvailable;
            }
            return;
        }
        drawMarketHistoryChart('market-history-institutional-chart', points, [
            { label: marketI18n('marketHistoryForeign', 'Foreign net'), color: '#55b8a8', sourceKeys: institutionalSources, field: 'foreign_net_shares' },
            { label: marketI18n('marketHistoryTrust', 'Trust net'), color: '#7198df', sourceKeys: institutionalSources, field: 'investment_trust_net_shares' },
        ], true);
        drawMarketHistoryChart('market-history-margin-chart', points, [
            { label: marketI18n('marketHistoryMarginBalance', 'Margin balance (lots)'), color: '#7198df', sourceKeys: margin, field: 'margin_balance_lots' },
            { label: marketI18n('marketHistoryShortBalance', 'Short balance (lots)'), color: '#dc806f', sourceKeys: margin, field: 'short_balance_lots' },
        ]);
        drawMarketHistoryChart('market-history-margin-flow-chart', points, [
            { label: marketI18n('marketHistoryMarginBuy', 'Margin buy (lots)'), color: '#55b8a8', sourceKeys: margin, field: 'margin_buy_lots' },
            { label: marketI18n('marketHistoryMarginSell', 'Margin sell (lots)'), color: '#dc806f', sourceKeys: margin, field: 'margin_sell_lots' },
            { label: marketI18n('marketHistoryShortSell', 'Short sell (lots)'), color: '#7198df', sourceKeys: margin, field: 'short_sell_lots' },
        ], true);
        drawMarketHistoryChart('market-history-borrow-chart', points, [
            { label: marketI18n('marketHistoryBorrowBalance', 'Borrowed stock sold balance (shares)'), color: '#55b8a8', sourceKeys: borrowed, field: 'borrow_short_balance_shares' },
        ]);
        drawMarketHistoryChart('market-history-borrow-flow-chart', points, [
            { label: marketI18n('marketHistoryBorrowSell', 'Borrowed stock sold (shares)'), color: '#7198df', sourceKeys: borrowed, field: 'borrow_short_sell_shares' },
            { label: marketI18n('marketHistoryReturned', 'Returned (shares)'), color: '#dc806f', sourceKeys: borrowed, field: 'borrow_short_return_shares' },
        ], true);
    } catch (error) { console.error('Market instrument history unavailable:', error); if (status) status.textContent = marketI18n('marketHistoryUnavailable', 'Historical data is temporarily unavailable.'); }
}

const marketFundamentalsCache = new Map<string, { payload: any; fetchedAt: number }>();
async function loadMarketFundamentals(code: string, productType: string) {
    const status = document.getElementById('market-fundamentals-status');
    const statementBox = document.getElementById('market-fundamentals-statements');
    const balanceBox = document.getElementById('market-fundamentals-balance');
    const cashFlowBox = document.getElementById('market-fundamentals-cash-flow');
    const source = document.getElementById('market-fundamentals-source');
    const noCompany = marketI18n('marketFundamentalsNoCompany', 'Company fundamentals are not available for index futures.');
    if (productType !== 'stock' || !/^\d{4}$/.test(code)) {
        if (status) status.textContent = noCompany;
        const chart = document.getElementById('market-fundamentals-revenue-chart'); if (chart) chart.replaceChildren();
        if (statementBox) statementBox.replaceChildren();
        if (balanceBox) balanceBox.replaceChildren();
        if (cashFlowBox) cashFlowBox.replaceChildren();
        if (source) source.textContent = '';
        return;
    }
    if (status) status.textContent = marketI18n('marketHistoryLoading', 'Loading history…');
    try {
        const cached = marketFundamentalsCache.get(code);
        let payload = cached && Date.now() - cached.fetchedAt < 15 * 60_000 ? cached.payload : null;
        if (!payload) {
            const response = await fetch(astroApiPath(`/api/market/dashboard/fundamentals/${encodeURIComponent(code)}`));
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            payload = await response.json(); marketFundamentalsCache.set(code, { payload, fetchedAt: Date.now() });
        }
        const monthly = payload.monthlyRevenue ?? [];
        const points: MarketHistoryPoint[] = monthly.map((row: any) => ({
            date: String(row.period), code, name: row.name || code,
            sources: { fundamentals: { revenue: Number(row.revenue), yoy: Number(row.yoyPercent), mom: Number(row.momPercent) } },
        })).filter((row: MarketHistoryPoint) => Number.isFinite(row.sources.fundamentals.revenue));
        drawMarketHistoryChart('market-fundamentals-revenue-chart', points, [{
            label: marketI18n('marketFundamentalsRevenue', 'Monthly revenue · NT$ thousands'), color: '#55b8a8',
            sourceKeys: ['fundamentals'], field: 'revenue',
            tooltip: (point) => {
                const values = point.sources.fundamentals;
                return `${point.date} · ${Number(values.revenue).toLocaleString()} · ${marketI18n('marketFundamentalsYoY', 'YoY')} ${Number.isFinite(values.yoy) ? `${values.yoy}%` : '—'} · ${marketI18n('marketFundamentalsMoM', 'MoM')} ${Number.isFinite(values.mom) ? `${values.mom}%` : '—'}`;
            },
        }], true);
        if (status) status.textContent = monthly.length ? `${code} · ${monthly[monthly.length - 1].period} · ${monthly[monthly.length - 1].publishedAt || '—'}` : marketI18n('marketFundamentalsNoRevenue', 'Monthly revenue is unavailable from the current official feed.');
        if (statementBox) {
            statementBox.replaceChildren();
            const officialItems = (payload.incomeStatements ?? []).slice(-8);
            const items: any[] = officialItems.length ? officialItems : finmindStatementGroups(payload.finmindIncomeStatements ?? []);
            if (!items.length) statementBox.textContent = marketI18n('marketFundamentalsNoStatements', 'Quarterly statements are not available for this company in the current public feed.');
            for (const item of items) {
                const card = document.createElement('div'); card.className = 'market-fundamental-card';
                const title = document.createElement('strong'); title.textContent = `${item.period} · ${item.publishedAt || ''}`;
                const amount = item.singleQuarter || {};
                const values = document.createElement('p');
                values.textContent = item.singleQuarter
                    ? `${marketI18n('marketFundamentalsRevenueLabel', 'Revenue')} ${formatFundamental(amount.revenue)} · ${marketI18n('marketFundamentalsGrossProfit', 'Gross profit')} ${formatFundamental(amount.grossProfit)} · ${marketI18n('marketFundamentalsOperatingIncome', 'Operating income')} ${formatFundamental(amount.operatingIncome)} · ${marketI18n('marketFundamentalsNetIncome', 'Net income')} ${formatFundamental(amount.netIncome)} · ${marketI18n('marketFundamentalsEps', 'EPS reported')} ${formatFundamental(item.epsReported)}`
                    : item.displayValues;
                const basis = document.createElement('small');
                const hasQuarter = Object.values(amount).some((value) => typeof value === 'number');
                if (officialItems.length) {
                    const margin = typeof amount.grossProfit === 'number' && typeof amount.revenue === 'number' && amount.revenue !== 0
                        ? ` · ${marketI18n('marketFundamentalsGrossMargin', 'Gross margin')} ${(amount.grossProfit / amount.revenue * 100).toFixed(2)}% (${marketI18n('marketFundamentalsGrossMarginFormula', 'gross profit ÷ revenue')})` : '';
                    if (margin) values.textContent += margin;
                    if (hasQuarter) basis.textContent = `${marketI18n('marketFundamentalsDerivedQuarter', 'Single quarter derived from official cumulative values; EPS stays as reported.')} ${item.unit}`;
                    else { values.textContent = `${marketI18n('marketFundamentalsReportedCumulative', 'Reported cumulative values')} ${JSON.stringify(item.reportedCumulative)} · EPS ${formatFundamental(item.epsReported)}`; basis.textContent = `${marketI18n('marketFundamentalsNoPriorQuarter', 'Preceding quarter is unavailable; values remain cumulative.')} ${item.unit}`; }
                } else basis.textContent = `Source: ${item.source || 'FinMind'} · values and item names shown as provided; units follow source metadata.`;
                card.append(title, values, basis); statementBox.append(card);
            }
        }
        const officialBalance = (payload.balanceSheets ?? []).slice(-8);
        renderFundamentalCards(balanceBox, officialBalance.length ? officialBalance : finmindStatementGroups(payload.finmindBalanceSheets ?? []), 'reportedCumulative');
        renderFundamentalCards(cashFlowBox, finmindStatementGroups(payload.cashFlows ?? []), '');
        if (source) source.textContent = `${marketI18n('marketFundamentalsSource', 'Source')}: ${payload.source}. ${payload.errors?.length ? payload.errors.join(' · ') : ''}`;
    } catch (error) {
        console.error('Market fundamentals unavailable:', error);
        if (status) status.textContent = marketI18n('marketHistoryUnavailable', 'Fundamentals are temporarily unavailable.');
    }
}

function formatFundamental(value: unknown): string {
    return typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—';
}

function finmindStatementGroups(rows: any[]): any[] {
    const grouped = new Map<string, any[]>();
    for (const row of rows) {
        if (!grouped.has(row.period)) grouped.set(row.period, []);
        grouped.get(row.period)!.push(row);
    }
    return [...grouped.entries()].slice(-8).map(([period, items]) => ({
        period,
        source: 'FinMind',
        unit: items.map((row) => row.unit).filter(Boolean).join(', '),
        displayValues: items.map((row) => `${row.item}: ${formatFundamental(row.value)}`).join(' · '),
    }));
}

function renderFundamentalCards(target: HTMLElement | null, items: any[], valuesKey: string) {
    if (!target) return;
    target.replaceChildren();
    for (const item of items) {
        const card = document.createElement('div'); card.className = 'market-fundamental-card';
        const title = document.createElement('strong'); title.textContent = `${item.period} · ${item.publishedAt || ''}`;
        const values = document.createElement('p'); values.textContent = item.displayValues || JSON.stringify(item[valuesKey] || {});
        const note = document.createElement('small'); note.textContent = `Source: ${item.source || 'FinMind'} · ${item.unit || 'source units'}`;
        card.append(title, values, note); target.append(card);
    }
    if (!items.length) target.textContent = marketI18n('marketFundamentalsNoRecords', 'No stored records are available for this statement.');
}

function renderOwnershipHistory(points: MarketHistoryPoint[]) {
    const holdingSources = ['twse:foreign-holding', 'tpex:foreign-holding'];
    drawMarketHistoryChart('market-history-foreign-holding-chart', points, [
        { label: marketI18n('marketHistoryForeignHoldingPercent', 'Foreign holding (%)'), color: '#55b8a8', sourceKeys: holdingSources, field: 'foreign_holding_percent', tooltip: (_, value) => `${value}%` },
    ]);
    drawMarketHistoryChart('market-history-foreign-holding-shares-chart', points, [
        { label: marketI18n('marketHistoryForeignHoldingShares', 'Foreign holding shares'), color: '#7198df', sourceKeys: holdingSources, field: 'foreign_holding_shares', tooltip: (_, value) => `${value.toLocaleString()} ${marketI18n('marketHistoryShares', 'shares')}` },
    ]);
    drawMarketHistoryChart('market-history-foreign-limit-chart', points, [
        { label: marketI18n('marketHistoryForeignLimit', 'Foreign investment limit (%)'), color: '#dc806f', sourceKeys: holdingSources, field: 'foreign_limit_percent', tooltip: (_, value) => `${value}%` },
    ]);
    renderTdccOwnership(points);
}

function renderTdccOwnership(points: MarketHistoryPoint[]) {
    const target = document.getElementById('market-history-ownership'); if (!target) return; target.replaceChildren();
    const snapshots = points.map((point) => ({ point, tiers: point.sources['tdcc:distribution-history']?.tiers }))
        .filter((entry) => Array.isArray(entry.tiers) && entry.tiers.length);
    if (!snapshots.length) { target.textContent = marketI18n('marketHistoryNoStored', 'No stored weekly distribution yet.'); return; }
    const latestTiers = snapshots[snapshots.length - 1].tiers as any[];
    const tiersToShow = [
        { id: '1-999', label: marketI18n('marketHistoryTierSmall', '1–999 shares'), color: '#55b8a8' },
        { id: '1,000-5,000', label: marketI18n('marketHistoryTierMedium', '1,000–5,000 shares'), color: '#7198df' },
        { id: '5,001-10,000', label: marketI18n('marketHistoryTierLarge', '5,001–10,000 shares'), color: '#dc806f' },
        { id: '1,000,001以上', label: marketI18n('marketHistoryTierMillionPlus', '1,000,001+ shares'), color: '#d5ae4b' },
    ].filter((tier) => latestTiers.some((item) => String(item.tier) === tier.id));
    const chart = document.createElement('div'); chart.id = 'market-history-tdcc-tier-chart'; chart.className = 'market-history-tdcc-chart'; target.append(chart);
    const chartPoints: MarketHistoryPoint[] = snapshots.map(({ point, tiers }) => {
        const values: MarketHistoryValues = {};
        for (const item of tiersToShow) {
            const tier = (tiers as any[]).find((entry) => String(entry.tier) === item.id);
            if (tier && Number.isFinite(Number(tier.percent))) values[`tier-${item.id}`] = Number(tier.percent);
        }
        return { ...point, sources: { 'tdcc:tiers': values } };
    });
    drawMarketHistoryChart(chart.id, chartPoints, tiersToShow.map((tier) => ({
        label: tier.label, color: tier.color, sourceKeys: ['tdcc:tiers'], field: `tier-${tier.id}`,
        tooltip: (point, value) => {
            const row = (snapshots.find((snapshot) => snapshot.point.date === point.date)?.tiers as any[] | undefined)
                ?.find((item) => String(item.tier) === tier.id);
            return row ? `${value}% · ${Number(row.shares).toLocaleString()} ${marketI18n('marketHistoryShares', 'shares')} · ${Number(row.holders).toLocaleString()} ${marketI18n('marketHistoryHolders', 'holders')}` : '—';
        },
    })), false, { x: marketI18n('marketHistoryDate', 'Date'), y: marketI18n('marketHistoryTierPercentAxis', 'Shareholding tier · shares outstanding (%)') });
    const latestNote = document.createElement('p'); latestNote.className = 'market-updated market-history-tdcc-latest';
    latestNote.textContent = `${marketI18n('marketHistoryLatestSnapshot', 'Latest snapshot')}: ${snapshots[snapshots.length - 1].point.date}`;
    target.append(latestNote);
}

function selectMarketDetailTab(tabName: string) {
    document.querySelectorAll<HTMLButtonElement>('[data-market-tab]').forEach((tab) => tab.setAttribute('aria-selected', String(tab.dataset.marketTab === tabName)));
    document.querySelectorAll<HTMLElement>('[data-market-panel]').forEach((panel) => { panel.hidden = panel.dataset.marketPanel !== tabName; });
    if (selectedMarketInstrument && tabName !== 'price') void loadMarketHistory(selectedMarketInstrument, tabName);
}

function setMarketDetailInstrument(instrument: DashboardInstrument) {
    selectedMarketInstrument = instrument;
    const detail = document.getElementById('market-instrument-detail'); if (detail) detail.hidden = false;
    const placeholder = document.getElementById('market-chart-placeholder'); if (placeholder) placeholder.hidden = true;
    const setText = (id: string, value: string) => { const element = document.getElementById(id); if (element) element.textContent = value; };
    const quote = instrument.quote;
    const underlyingCode = instrument.productType === 'futures'
        ? (quote?.underlyingCode || instrument.underlyingCode || '') : '';
    setText('market-detail-title', `${instrument.code} · ${instrument.name}${instrument.productType === 'futures' ? ` · ${underlyingCode ? `${underlyingCode} spot charts` : 'TAIFEX futures charts'}` : ''}`);
    const institutionalDescription = document.getElementById('market-history-institutional-description');
    if (institutionalDescription) institutionalDescription.textContent = instrument.productType === 'futures'
        ? (underlyingCode
            ? `${underlyingCode} ${marketI18n('marketHistorySpotInstitutionalDescription', 'spot ticker institutional net trading · shares')}`
            : marketI18n('marketHistoryTaifexAggregateDescription', 'TAIFEX participant totals for the futures product category; not contract-specific positions.'))
        : marketI18n('marketHistoryInstitutionalDescription', 'Foreign, investment trust, and dealer net trading · shares');
    // Keep all four tabs available. Stock futures use their underlying stock;
    // index futures show TAIFEX price/category data and explain unsupported
    // stock-only margin, lending, and ownership panels.
    document.querySelectorAll<HTMLButtonElement>('[data-market-tab]').forEach((tab) => { tab.hidden = false; });
    const initialTab = underlyingCode || instrument.productType === 'stock' ? 'fundamentals' : 'price';
    selectMarketDetailTab(initialTab);
    if (initialTab === 'price') void loadMarketHistory(instrument, initialTab);
}

function renderDashboardRows(targetId: string, instruments: DashboardInstrument[], emptyText: string) {
    const target = document.getElementById(targetId);
    if (!target) return;
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
        const name = document.createElement('small'); name.textContent = `${instrument.name} · ${instrument.productType === 'stock' ? 'Stock' : 'Futures'}${quote?.deliveryMonth ? ` · ${quote.deliveryMonth}` : ''}`;
        item.append(code, name);
        const price = document.createElement('span'); price.className = 'market-watch-price';
        const last = document.createElement('strong'); last.textContent = quote?.close ? quote.close.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '--';
        const change = document.createElement('small');
        change.textContent = quote ? `${quote.change >= 0 ? '+' : ''}${quote.change.toLocaleString()} (${quote.changePercent >= 0 ? '+' : ''}${quote.changePercent.toFixed(2)}%)` : 'Quote unavailable';
        change.classList.toggle('up', Boolean(quote && quote.change >= 0)); change.classList.toggle('down', Boolean(quote && quote.change < 0));
        price.append(last, change);
        const timestamp = document.createElement('span'); timestamp.className = 'market-updated'; timestamp.textContent = quote?.timestamp ? new Date(quote.timestamp).toLocaleString() : '--';
        row.append(item, price, timestamp);
        row.addEventListener('click', () => {
            document.querySelectorAll<HTMLButtonElement>('.market-watch-row--selected').forEach((item) => item.setAttribute('aria-expanded', String(item === row && row.getAttribute('aria-expanded') !== 'true')));
            const detail = document.getElementById('market-instrument-detail');
            const expanded = row.getAttribute('aria-expanded') === 'true';
            if (detail) detail.hidden = !expanded;
            const placeholder = document.getElementById('market-chart-placeholder');
            if (placeholder) placeholder.hidden = expanded;
            if (expanded) setMarketDetailInstrument(instrument);
        });
        target.append(row);
    }
}

async function fetchMarketDashboard() {
    try {
        const response = await fetch(astroApiPath('/api/market/dashboard'));
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json() as MarketDashboardPayload;
        renderDashboardRows('market-auto-list', data.automatic?.positions ?? [], 'No complete valid holdings snapshot is available yet.');
        renderDashboardRows('market-custom-list', data.custom ?? [], 'No custom instruments selected.');
        const updated = document.getElementById('market-auto-updated');
        if (updated) updated.textContent = data.automatic?.snapshotAt ? ` · Snapshot ${new Date(data.automatic.snapshotAt).toLocaleString()}` : '';
    } catch (error) {
        console.error('Market dashboard unavailable:', error);
        renderDashboardRows('market-auto-list', [], 'Automatic selections are temporarily unavailable.');
        renderDashboardRows('market-custom-list', [], 'Custom selections are temporarily unavailable.');
    }
}

function initMarketCustomEditor() {
    const button = document.getElementById('market-custom-edit') as HTMLButtonElement | null;
    const dialog = document.getElementById('market-custom-dialog') as HTMLDialogElement | null;
    if (!button || !dialog || button.dataset.bound === 'true' || !hasMarketAuth()) return;
    button.dataset.bound = 'true';
    let selected: { code: string; name: string; productType: 'stock' | 'futures'; deliveryMonth?: string }[] = [];
    const selectedBox = document.getElementById('market-custom-selected');
    const resultsBox = document.getElementById('market-search-results');
    const error = document.getElementById('market-custom-error');
    const candidateBox = document.getElementById('market-candidate-results');
    const identity = (value: { code: string; productType: 'stock' | 'futures'; deliveryMonth?: string }) =>
        value.code.toUpperCase();
    const loadCandidates = async (query = '') => {
        if (!candidateBox) return;
        candidateBox.replaceChildren();
        const response = await fetch(`${astroApiPath('/api/market/dashboard/candidates')}?q=${encodeURIComponent(query)}`, { headers: marketAuthHeaders() });
        if (!response.ok) return;
        const payload = await response.json();
        (payload.results ?? []).forEach((item: { code: string; name: string; productType: 'stock' | 'futures'; deliveryMonth?: string }) => {
            const row = document.createElement('div'); row.className = 'market-search-result';
            const text = document.createElement('span'); text.textContent = `${item.code} · ${item.name} · ${item.productType}${item.deliveryMonth ? ` · ${item.deliveryMonth}` : ''}`;
            const add = document.createElement('button'); add.type = 'button'; add.textContent = selected.some((value) => identity(value) === identity(item)) ? 'Added' : 'Add';
            add.disabled = add.textContent === 'Added' || selected.length >= 5;
            add.addEventListener('click', () => { if (selected.length < 5) selected.push(item); renderSelected(); add.disabled = true; add.textContent = 'Added'; });
            row.append(text, add); candidateBox.append(row);
        });
        if (!payload.results?.length) candidateBox.textContent = 'No historical candidates.';
    };
    const renderSelected = () => {
        if (!selectedBox) return;
        selectedBox.replaceChildren();
        const count = document.getElementById('market-custom-count'); if (count) count.textContent = `${selected.length} / 5`;
        selected.forEach((item, index) => {
            const row = document.createElement('div'); row.className = 'market-search-result';
            const text = document.createElement('span'); text.textContent = `${item.code} · ${item.name} · ${item.productType}${item.deliveryMonth ? ` · ${item.deliveryMonth}` : ''}`;
            const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = 'Remove'; remove.addEventListener('click', () => { selected.splice(index, 1); renderSelected(); });
            row.append(text, remove); selectedBox.append(row);
        });
    };
    button.addEventListener('click', async () => {
        const response = await fetch(astroApiPath('/api/market/dashboard/custom'), { headers: marketAuthHeaders() });
        if (!response.ok) { button.hidden = true; return; }
        const payload = await response.json(); selected = payload.symbols ?? [];
        renderSelected(); if (error) error.textContent = ''; dialog.showModal(); void loadCandidates();
    });
    const search = async () => {
        const input = document.getElementById('market-symbol-search') as HTMLInputElement | null;
        if (!input || !resultsBox) return;
        resultsBox.replaceChildren();
        if (error) error.textContent = '';
        const query = input.value.trim(); if (!query) return;
        const response = await fetch(`${astroApiPath('/api/market/dashboard/search')}?q=${encodeURIComponent(query)}`, { headers: marketAuthHeaders() });
        if (!response.ok) { if (error) error.textContent = `Search unavailable (HTTP ${response.status}).`; return; }
        const payload = await response.json();
        (payload.results ?? []).forEach((item: { code: string; name: string; productType: 'stock' | 'futures'; deliveryMonth?: string }) => {
            const row = document.createElement('div'); row.className = 'market-search-result';
            const text = document.createElement('span'); text.textContent = `${item.code} · ${item.name} · ${item.productType}${item.deliveryMonth ? ` · ${item.deliveryMonth}` : ''}`;
            const add = document.createElement('button'); add.type = 'button'; add.textContent = selected.some((value) => identity(value) === identity(item)) ? 'Added' : 'Add';
            add.disabled = add.textContent === 'Added' || selected.length >= 5;
            add.addEventListener('click', () => { if (selected.length < 5) selected.push(item); renderSelected(); add.disabled = true; add.textContent = 'Added'; });
            row.append(text, add); resultsBox.append(row);
        });
        if (!payload.results?.length) resultsBox.textContent = 'No matching stock or futures contract.';
    };
    document.getElementById('market-search-submit')?.addEventListener('click', () => { void search(); });
    document.getElementById('market-candidate-search')?.addEventListener('input', (event) => { void loadCandidates((event.target as HTMLInputElement).value); });
    document.getElementById('market-symbol-search')?.addEventListener('keydown', (event) => { if ((event as KeyboardEvent).key === 'Enter') { event.preventDefault(); void search(); } });
    document.getElementById('market-custom-cancel')?.addEventListener('click', () => dialog.close());
    document.getElementById('market-custom-save')?.addEventListener('click', async () => {
        const response = await fetch(astroApiPath('/api/market/dashboard/custom'), {
            method: 'PUT', headers: { ...marketAuthHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ symbols: selected }),
        });
        if (!response.ok) { if (error) error.textContent = `Save failed (HTTP ${response.status}).`; return; }
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
        label.textContent = `${(value / 10000).toFixed(0)}萬`;
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
    setText('txf-change', `${quote.change >= 0 ? '+' : ''}${formatNumber(quote.change)} (${quote.changePercent >= 0 ? '+' : ''}${quote.changePercent.toFixed(2)}%)`);
    setText('txf-market-status', offline ? 'Offline' : '10m');
    setText(
        'txf-updated',
        quote.timestamp
            ? new Date(quote.timestamp).toLocaleString()
            : new Date().toLocaleString(),
    );

    const change = document.getElementById('txf-change');
    change?.classList.toggle('up', quote.change >= 0);
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
        const sign = value >= 0 ? '+' : '-';
        const amount = Math.abs(value).toLocaleString(undefined, { maximumFractionDigits: 0 });
        return `${sign}NT$ ${amount}`;
    };
    setSummaryTooltip('portfolio-pnl', 'portfolio-pnl-tooltip',
        `證券  ${nbCurrency(secPnl)}\n+ 期貨  ${nbCurrency(futPnl)}`
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
            el.textContent = `台 ${fmt(regions.taiwan)} · 外 ${fmt(regions.overseas)}`;
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
            tooltipEl.innerHTML = `<strong>Cash · ${pct.toFixed(2)}%</strong><span>${currency(slice.value)}</span>`;
        } else if (slice.isOverseas && slice.overseas) {
            const o = slice.overseas;
            const nativeFmt = (v: number) => v.toLocaleString(undefined, { maximumFractionDigits: 0 });
            tooltipEl.innerHTML = `<strong>${o.name || slice.code}</strong>
               <small>${slice.code} · ${o.assetClass} · ${pct.toFixed(2)}%</small>
               <span>Qty ${o.quantity} · Cost ${nativeFmt(o.averagePrice)} · Last ${nativeFmt(o.lastPrice)}</span>
               <span>Value ${o.currency} ${nativeFmt(o.marketValueNative)} · ${currency(slice.value)}</span>
               <b class="${o.pnlTwd >= 0 ? 'up' : 'down'}">P/L ${o.pnlTwd >= 0 ? '+' : ''}${currency(o.pnlTwd)}</b>`;
        } else if (slice.isFutures) {
            tooltipEl.innerHTML = `<strong>${pos.name || pos.code}</strong>
               <small>${pos.code} · ${pct.toFixed(2)}%</small>
               <span>${pos.direction} · Net ${pos.signedQuantity > 0 ? '+' : ''}${pos.signedQuantity}</span>
               <span>Cost ${pos.averagePrice.toLocaleString()} · Last ${pos.lastPrice.toLocaleString()}</span>
               <span>分子 ${currency(slice.value)} / 分母 ${currency(total)}</span>
               <b class="${pos.pnl >= 0 ? 'up' : 'down'}">P/L ${pos.pnl >= 0 ? '+' : ''}${currency(pos.pnl)}</b>`;
        } else {
            tooltipEl.innerHTML = `<strong>${pos.name || pos.code}</strong>
               <small>${pos.code} · ${pct.toFixed(2)}%</small>
               <span>${pos.quantity} shares · YD ${pos.ydQuantity ?? 0}</span>
               <span>Cost ${pos.averagePrice.toLocaleString()} · Last ${pos.lastPrice.toLocaleString()}</span>
               <span>Value ${currency(pos.marketValue)}</span>
               <b class="${pos.pnl >= 0 ? 'up' : 'down'}">P/L ${pos.pnl >= 0 ? '+' : ''}${currency(pos.pnl)}</b>`;
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

// Visit Counter Functionality
async function updateVisitCount() {
    try {
        // Check if we have a session cookie
        const sessionCookie = getCookie('visit_session');
        
        if (!sessionCookie) {
            // If no session cookie exists, increment the counter
            await fetch(`${import.meta.env.PUBLIC_API_BASE_URL}/voyeur/increment/`, {
                method: 'POST'
            });
            
            // Set a session cookie that expires in 30 minutes
            setCookie('visit_session', 'true', 30);
        }

        // Get the current count regardless of whether we incremented
        const response = await fetch(`${import.meta.env.PUBLIC_API_BASE_URL}/voyeur/count/`);
        const data = await response.json();
        
        // Update the counter in the DOM
        const visitCountElement = document.getElementById('visit-count');
        if (visitCountElement) {
            visitCountElement.textContent = data.count;
        }
    } catch (error) {
        console.error('Error updating visit count:', error);
        const visitCountElement = document.getElementById('visit-count');
        if (visitCountElement) {
            visitCountElement.textContent = '?';
        }
    }
}

// Cookie helper functions
function setCookie(name: string, value: string, minutes: number) {
    const date = new Date();
    date.setTime(date.getTime() + (minutes * 60 * 1000));
    const expires = "expires=" + date.toUTCString();
    document.cookie = name + "=" + value + ";" + expires + ";path=/";
}

function getCookie(name: string): string {
    const cookieName = name + "=";
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
        let cookie = cookies[i].trim();
        if (cookie.indexOf(cookieName) === 0) {
            return cookie.substring(cookieName.length, cookie.length);
        }
    }
    return "";
}

// Call the function when the page loads - 支援 View Transitions
function initIndexPage() {
    // 檢查是否在首頁，避免在其他頁面執行
    const isIndexPage = window.location.pathname === '/tymultiverse/' ||
                        window.location.pathname === '/tymultiverse' ||
                        window.location.pathname === '/' ||
                        window.location.pathname.endsWith('/index.html');

    if (!isIndexPage) return;

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
    initMarketCustomEditor();
    void fetchMarketDashboard();
    fetchLeetCodeStats();
    fetchTxfQuote();
    fetchMarketUsage();
    fetchPortfolio();
    if (_marketQuoteTimer !== null) window.clearInterval(_marketQuoteTimer);
    _marketQuoteTimer = window.setInterval(() => {
        fetchTxfQuote();
        fetchMarketUsage();
    }, 600_000);
    if (_portfolioTimer !== null) window.clearInterval(_portfolioTimer);
    _portfolioTimer = window.setInterval(fetchPortfolio, 3_600_000);
    updateVisitCount();
}

// 監聽 View Transitions 事件
document.addEventListener('astro:page-load', initIndexPage);
