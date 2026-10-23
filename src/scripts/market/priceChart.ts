import { formatNumber } from '../format/numbers';
import { addChartControls, bindChartZoom, chartView, readChartPreference, visibleRows, writeChartPreference } from './chartViewport';
import { comparisonAt, PRICE_METRICS, priceCandles, type PriceMetric, type PricePoint, type StatementComparisons } from './priceComparison';

type Options = { zh: boolean; currency: string; comparisons?: StatementComparisons; financialsLoading?: boolean; futures?: boolean };
const STORAGE_KEY = 'market-price-comparison:v1';
let selected: PriceMetric | undefined;
function storage() { try { return window.localStorage; } catch { return undefined; } }
const metricColors = { pe: '#d5ae4b', inventoryDays: '#f08e82', operatingMargin: '#7198df', none: '#999' };
function element<K extends keyof SVGElementTagNameMap>(tag: K, attributes: Record<string, string | number> = {}, text?: string): SVGElementTagNameMap[K] {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, String(value)));
    if (text !== undefined) node.textContent = text;
    return node;
}

/** Price and one selectable financial metric share time, with independent left/right scales. */
export function renderPriceChart(targetId: string, points: readonly PricePoint[], sources: string[], volumeField: string, options: Options) {
    const target = document.getElementById(targetId); if (!target) return;
    const { zh } = options;
    const locale = zh ? 'zh-TW' : 'en-US';
    const labels = zh ? ['本益比', '庫存天數', '營益率', '不疊加'] : ['P/E', 'Inventory days', 'Operating margin', 'None'];
    const units = zh ? { pe: '倍', inventoryDays: '天', operatingMargin: '%', none: '' } : { pe: '×', inventoryDays: 'days', operatingMargin: '%', none: '' };
    selected ??= readChartPreference(storage(), STORAGE_KEY, PRICE_METRICS, 'pe');
    const metric: PriceMetric = options.futures ? 'none' : selected;
    const metricLabel = labels[PRICE_METRICS.indexOf(metric)];
    const tone = metricColors[metric];
    const all = priceCandles(points, sources, volumeField);
    const dates = all.map(p => p.date);
    const redraw = () => renderPriceChart(targetId, points, sources, volumeField, options);
    const candles = visibleRows(all, p => p.date, chartView(targetId, dates).window);
    target.replaceChildren();
    addChartControls(target, targetId, dates, redraw, zh);
    if (!options.futures) {
        const label = document.createElement('label'); label.className = 'market-price-comparison';
        label.append(document.createTextNode(zh ? '右軸指標 ' : 'Right axis '));
        const select = document.createElement('select'); select.setAttribute('aria-label', zh ? '股價比較指標' : 'Price comparison metric');
        PRICE_METRICS.forEach((value, i) => { const item = document.createElement('option'); item.value = value; item.textContent = labels[i]; select.append(item); });
        select.value = metric;
        select.addEventListener('change', () => { selected = select.value as PriceMetric; writeChartPreference(storage(), STORAGE_KEY, selected); redraw(); });
        label.append(select); target.append(label);
    }
    if (!candles.length) {
        const empty = document.createElement('p'); empty.textContent = zh ? '此範圍沒有觀察值，請選更長的時間範圍。' : 'No observations in this range. Choose a wider range.';
        target.append(empty); return;
    }
    const comparisons = candles.map(candle => metric === 'pe' ? (candle.pe === null ? null : { value: candle.pe, period: candle.date, estimated: false })
        : metric === 'none' ? null : comparisonAt(options.comparisons?.[metric] ?? [], candle.date));
    const numbers = comparisons.flatMap(point => point ? [point.value] : []);
    const width = Math.max(280, Math.min(1000, target.clientWidth || 900)), height = 390;
    const left = width < 480 ? 52 : 72, right = width - (metric === 'none' ? 16 : width < 480 ? 58 : 84);
    const top = 30, bottom = 246, volumeTop = 274, volumeBottom = 330;
    const minPrice = Math.min(...candles.map(p => p.low)), maxPrice = Math.max(...candles.map(p => p.high));
    const pad = (maxPrice - minPrice || Math.abs(maxPrice) * .05 || 1) * .08;
    const low = minPrice - pad, high = maxPrice + pad;
    const minMetric = numbers.length ? Math.min(...numbers) : 0, maxMetric = numbers.length ? Math.max(...numbers) : 1;
    const metricPad = (maxMetric - minMetric || Math.abs(maxMetric) * .05 || 1) * .1;
    const metricLow = minMetric - metricPad, metricHigh = maxMetric + metricPad;
    const slot = (right - left) / candles.length, barWidth = Math.max(.5, Math.min(9, slot * .64));
    const x = (i: number) => left + slot * (i + .5);
    const y = (value: number) => top + (high - value) / (high - low) * (bottom - top);
    const yMetric = (value: number) => top + (metricHigh - value) / (metricHigh - metricLow) * (bottom - top);
    const price = (value: number) => formatNumber(value, 'decimal', { locale });
    const metricText = (value: number) => `${formatNumber(value, metric === 'operatingMargin' ? 'percent' : 'decimal', { locale })}${metric === 'operatingMargin' ? '' : ` ${units[metric]}`}`;
    const svg = element('svg', { viewBox: `0 0 ${width} ${height}`, role: 'img', tabindex: 0, 'aria-label': `${zh ? '股價與成交量' : 'OHLC and volume'} · ${options.currency}${metric === 'none' ? '' : ` / ${metricLabel}`}`, class: 'market-history-chart' });
    for (let tick = 0; tick <= 4; tick++) {
        const value = low + (high - low) * tick / 4, tickY = y(value);
        svg.append(element('line', { x1: left, x2: right, y1: tickY, y2: tickY, class: 'market-history-grid' }));
        svg.append(element('text', { x: left - 6, y: tickY + 4, 'text-anchor': 'end', class: 'market-history-axis-label' }, price(value)));
        if (numbers.length) svg.append(element('text', { x: right + 6, y: tickY + 4, class: 'market-history-axis-label', style: `fill:${tone}` }, metricText(metricLow + (metricHigh - metricLow) * tick / 4)));
    }
    svg.append(element('text', { x: left, y: 16, class: 'market-history-axis-title' }, `${zh ? '股價' : 'Price'} (${options.currency})`));
    if (metric !== 'none') svg.append(element('text', { x: right, y: 16, 'text-anchor': 'end', class: 'market-history-axis-title', style: `fill:${tone}` }, `${metricLabel} (${units[metric]})`));
    const maxVolume = Math.max(...candles.map(p => p.volume ?? 0), 1);
    candles.forEach((candle, i) => {
        const color = candle.close >= candle.open ? '#e45b5b' : '#46a77f';
        svg.append(element('line', { x1: x(i), x2: x(i), y1: y(candle.high), y2: y(candle.low), stroke: color }));
        svg.append(element('rect', { x: x(i) - barWidth / 2, y: Math.min(y(candle.open), y(candle.close)), width: barWidth, height: Math.max(1, Math.abs(y(candle.open) - y(candle.close))), fill: color }));
        if (candle.volume !== null) {
            const h = Math.max(1, candle.volume / maxVolume * (volumeBottom - volumeTop));
            svg.append(element('rect', { x: x(i) - barWidth / 2, y: volumeBottom - h, width: barWidth, height: h, fill: color, opacity: .65 }));
        }
    });
    if (numbers.length) {
        let previous = false;
        const path = comparisons.map((point, i) => {
            if (!point) { previous = false; return ''; }
            const command = previous ? (metric === 'pe' ? 'L' : 'H') : 'M'; previous = true;
            return command === 'H' ? `H ${x(i)} V ${yMetric(point.value)}` : `${command} ${x(i)} ${yMetric(point.value)}`;
        }).join(' ');
        svg.append(element('path', { d: path, fill: 'none', stroke: tone, 'stroke-width': 2, 'data-price-metric': metric }));
    }
    svg.append(element('text', { x: left, y: volumeTop - 8, class: 'market-history-axis-title' }, zh ? `成交量（${options.futures ? '口' : '股'}）` : `Volume (${options.futures ? 'contracts' : 'shares'})`));
    const ticks = Math.min(candles.length, width < 480 ? 2 : 5);
    for (let i = 0; i < ticks; i++) {
        const index = Math.round(i * (candles.length - 1) / Math.max(ticks - 1, 1));
        svg.append(element('text', { x: x(index), y: 351, 'text-anchor': i === 0 ? 'start' : i === ticks - 1 ? 'end' : 'middle', class: 'market-history-axis-label' }, candles[index].date));
    }
    svg.append(element('text', { x: (left + right) / 2, y: 375, 'text-anchor': 'middle', class: 'market-history-axis-title' }, zh ? '日期' : 'Date'));
    const guide = element('line', { y1: top, y2: volumeBottom, class: 'market-history-guide' }); svg.append(guide);
    const marker = element('circle', { r: 4, fill: tone }); svg.append(marker);
    const readout = document.createElement('div'); readout.className = 'market-chart-readout'; readout.setAttribute('aria-live', 'polite');
    let active = candles.length - 1, pinned: number | null = null, drag: number | null = null;
    const show = (index: number) => {
        active = index; const candle = candles[index], value = comparisons[index];
        guide.setAttribute('x1', String(x(index))); guide.setAttribute('x2', String(x(index)));
        marker.style.display = value ? '' : 'none';
        if (value) { marker.setAttribute('cx', String(x(index))); marker.setAttribute('cy', String(yMetric(value.value))); }
        readout.replaceChildren();
        const prices = document.createElement('span'); prices.textContent = `${candle.date} · O ${price(candle.open)} · H ${price(candle.high)} · L ${price(candle.low)} · C ${price(candle.close)} ${options.currency} · ${zh ? '成交量' : 'Volume'} ${formatNumber(candle.volume, 'count', { locale })} ${options.futures ? (zh ? '口' : 'contracts') : (zh ? '股' : 'shares')}`;
        readout.append(prices);
        if (metric !== 'none') {
            const entry = document.createElement('span'); entry.style.color = tone;
            entry.textContent = `${metricLabel} ${value ? metricText(value.value) : '—'}${value && metric !== 'pe' ? ` · ${value.period}${value.estimated ? (zh ? '（依估計公布日對齊）' : ' (estimated publication date)') : ''}` : ''}`;
            readout.append(entry);
        }
    };
    const indexAt = (clientX: number) => {
        const rect = svg.getBoundingClientRect();
        return Math.max(0, Math.min(candles.length - 1, Math.floor(((clientX - rect.left) / Math.max(rect.width, 1) * width - left) / slot)));
    };
    svg.style.touchAction = 'pan-y';
    svg.addEventListener('pointermove', event => {
        const index = indexAt(event.clientX); show(index);
        if (drag !== null && drag !== index) {
            const start = candles[drag], end = candles[index];
            const comparison = document.createElement('span');
            comparison.textContent = `${start.date} → ${end.date} · ${formatNumber(start.close ? (end.close / start.close - 1) * 100 : null, 'percent', { signed: true, locale })}`;
            readout.append(comparison);
        }
    });
    svg.addEventListener('pointerdown', event => { drag = indexAt(event.clientX); show(drag); });
    svg.addEventListener('pointerup', event => { pinned = indexAt(event.clientX); drag = null; });
    svg.addEventListener('pointercancel', () => { drag = null; });
    svg.addEventListener('pointerleave', () => { drag = null; show(pinned ?? candles.length - 1); });
    svg.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        show(event.key === 'Home' ? 0 : event.key === 'End' ? candles.length - 1 : Math.max(0, Math.min(candles.length - 1, active + (event.key === 'ArrowLeft' ? -1 : 1))));
    });
    bindChartZoom(svg, targetId, dates, redraw, { left: left / width, right: right / width });
    show(active); target.append(svg, readout);
    if (metric !== 'none' && !numbers.length) {
        const note = document.createElement('p'); note.className = 'market-updated';
        note.textContent = options.financialsLoading && metric !== 'pe' ? (zh ? '正在載入財報指標…' : 'Loading financial metrics…')
            : zh ? `${metricLabel}在此期間沒有可用資料。` : `${metricLabel}: no available data in this range.`;
        target.append(note);
    }
    if (comparisons.some(point => point?.estimated)) {
        const note = document.createElement('p'); note.className = 'market-updated';
        note.textContent = zh ? '缺少實際公告日的財報，以台灣申報期限／海外期末後 120 天估計對齊；供趨勢比較，非公告時點回測。' : 'Missing publication dates use Taiwan filing deadlines / 120 days after overseas period end; for trend comparison, not point-in-time backtesting.';
        target.append(note);
    }
}
