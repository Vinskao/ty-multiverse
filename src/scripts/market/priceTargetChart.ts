import { formatNumber } from '../format/numbers';
import { addChartControls, bindChartZoom, chartView } from './chartViewport';
import { actionViews, firmColors, latestTargets, targetSeries, viewsInWindow, type ClosePoint, type TargetAction, type TargetConsensus, type TargetView } from './priceTargets';

type Options = { actions: TargetAction[]; consensus: TargetConsensus[]; closes: ClosePoint[]; currency: string; zh: boolean; views?: TargetView[] };
const DIRECTION: Record<string, [string, string, string]> = { tailwind: ['順風', 'Tailwind', 'market-delta--up'], neutral: ['中性', 'Neutral', ''], headwind: ['逆風', 'Headwind', 'market-delta--down'] };
const PALETTE = ['#d5ae4b', '#7198df', '#f08e82', '#55b8a8', '#b48ce0', '#e0a35c', '#8fc46a', '#e57fb0'];
const OTHER = '#8a8f98', CLOSE = '#c9ced6', CONSENSUS = '#55b8a8';
function element<K extends keyof SVGElementTagNameMap>(tag: K, attributes: Record<string, string | number> = {}, text?: string): SVGElementTagNameMap[K] {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, String(value)));
    if (text !== undefined) node.textContent = text;
    return node;
}

/** Close price, consensus mean with its high–low band, and each broker's target as a dot, on one time axis. */
export function renderPriceTargetChart(targetId: string, options: Options) {
    const target = document.getElementById(targetId); if (!target) return;
    const { zh, currency } = options;
    const locale = zh ? 'zh-TW' : 'en-US';
    const price = (value: number) => formatNumber(value, 'decimal', { locale });
    const percent = (value: number | null) => value === null ? '—' : formatNumber(value * 100, 'percent', { signed: true, locale });
    target.replaceChildren();
    const views = options.views ?? [];
    const direction = (value: string) => DIRECTION[value] ?? DIRECTION.neutral;
    const allDates = [...options.closes.map(p => p.date), ...options.consensus.map(p => p.date), ...options.actions.filter(a => a.target).map(a => a.date),
        ...views.flatMap(v => v.date ? [v.date] : [])];
    if (!options.actions.some(a => a.target) && !options.consensus.length && !views.length) {
        const empty = document.createElement('p'); empty.className = 'market-updated';
        empty.textContent = zh ? '尚無目標價資料；每日收集後會出現。' : 'No target prices stored yet; they appear after the daily collection.';
        target.append(empty); return;
    }
    const redraw = () => renderPriceTargetChart(targetId, options);
    addChartControls(target, targetId, allDates, redraw, zh);
    const series = targetSeries(options.actions, options.consensus, options.closes, chartView(targetId, allDates).window);
    const colors = firmColors(options.actions, PALETTE);
    const width = Math.max(280, Math.min(1000, target.clientWidth || 900)), height = 352;
    const left = width < 480 ? 52 : 72, right = width - 16, top = 24, bottom = 270;
    const values = [...series.close, ...series.consensus.flatMap(row => row ? [row.high, row.low, row.mean] : []), ...series.dots.map(d => d.target)]
        .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
    const svg = element('svg', { viewBox: `0 0 ${width} ${height}`, role: 'img', tabindex: 0, class: 'market-history-chart',
        'aria-label': `${zh ? '券商目標價與股價' : 'Broker target prices and close'} · ${currency}` });
    const readout = document.createElement('div'); readout.className = 'market-chart-readout'; readout.setAttribute('aria-live', 'polite');
    if (!series.dates.length || !values.length) {
        const empty = document.createElement('p'); empty.className = 'market-updated';
        empty.textContent = zh ? '此範圍沒有觀察值，請選更長的時間範圍。' : 'No observations in this range. Choose a wider range.';
        target.append(empty); return;
    }
    const min = Math.min(...values), max = Math.max(...values), pad = (max - min || Math.abs(max) * .05 || 1) * .08;
    const low = min - pad, high = max + pad;
    const slot = (right - left) / series.dates.length;
    const x = (i: number) => left + slot * (i + .5);
    const y = (value: number) => top + (high - value) / (high - low) * (bottom - top);
    const index = new Map(series.dates.map((date, i) => [date, i]));
    for (let tick = 0; tick <= 4; tick++) {
        const value = low + (high - low) * tick / 4;
        svg.append(element('line', { x1: left, x2: right, y1: y(value), y2: y(value), class: 'market-history-grid' }));
        svg.append(element('text', { x: left - 6, y: y(value) + 4, 'text-anchor': 'end', class: 'market-history-axis-label' }, price(value)));
    }
    svg.append(element('text', { x: left, y: 14, class: 'market-history-axis-title' }, `${zh ? '價格' : 'Price'} (${currency})`));
    // Consensus high–low band and mean as steps: a snapshot holds until the next one.
    const band = series.consensus.map((row, i) => row && row.high !== null && row.low !== null ? { i, high: row.high, low: row.low } : null)
        .filter((row): row is { i: number; high: number; low: number } => row !== null);
    if (band.length) {
        const upper = band.map(row => `${x(row.i) - slot / 2},${y(row.high)} ${x(row.i) + slot / 2},${y(row.high)}`).join(' ');
        const lower = [...band].reverse().map(row => `${x(row.i) + slot / 2},${y(row.low)} ${x(row.i) - slot / 2},${y(row.low)}`).join(' ');
        svg.append(element('polygon', { points: `${upper} ${lower}`, fill: CONSENSUS, opacity: .12 }));
    }
    const line = (points: Array<number | null>, attributes: Record<string, string | number>) => {
        let pen = false;
        const d = points.map((value, i) => { if (value === null) { pen = false; return ''; } const c = pen ? 'L' : 'M'; pen = true; return `${c} ${x(i)} ${y(value)}`; }).join(' ');
        if (d.trim()) svg.append(element('path', { d, fill: 'none', ...attributes }));
    };
    line(series.consensus.map(row => row?.mean ?? null), { stroke: CONSENSUS, 'stroke-width': 2, 'stroke-dasharray': '6 4', 'data-consensus-mean': '' });
    line(series.close, { stroke: CLOSE, 'stroke-width': 1.5 });
    for (const dot of series.dots) {
        const i = index.get(dot.date)!;
        const circle = element('circle', { cx: x(i), cy: y(dot.target), r: 4.5, fill: colors.get(dot.firm) ?? OTHER, stroke: '#0b0d12', 'stroke-width': 1, 'data-target-dot': dot.firm, class: 'market-target-dot' });
        circle.addEventListener('click', () => showDetail(dot.action));
        svg.append(circle);
    }
    // Views lane: one diamond per dated report claim, at the nearest chart date on or after it.
    const laneY = 318;
    const shownViews = viewsInWindow(views, chartView(targetId, allDates).window);
    if (shownViews.length) svg.append(element('text', { x: left - 6, y: laneY + 4, 'text-anchor': 'end', class: 'market-history-axis-label' }, zh ? '看法' : 'Views'));
    const viewIndex = (date: string) => { const at = series.dates.findIndex(d => d >= date); return at < 0 ? series.dates.length - 1 : at; };
    for (const view of shownViews) {
        const cx = x(viewIndex(view.date!));
        const mark = element('rect', { x: cx - 4, y: laneY - 4, width: 8, height: 8, transform: `rotate(45 ${cx} ${laneY})`,
            class: `market-target-view market-target-view--${view.direction}`, 'data-target-view': view.date! });
        mark.append(element('title', {}, `${view.date} ${view.publisher} ${direction(view.direction)[zh ? 0 : 1]}：${view.claim}`));
        svg.append(mark);
    }
    const ticks = Math.min(series.dates.length, width < 480 ? 2 : 5);
    for (let t = 0; t < ticks; t++) {
        const i = Math.round(t * (series.dates.length - 1) / Math.max(ticks - 1, 1));
        svg.append(element('text', { x: x(i), y: 292, 'text-anchor': t === 0 ? 'start' : t === ticks - 1 ? 'end' : 'middle', class: 'market-history-axis-label' }, series.dates[i]));
    }
    const guide = element('line', { y1: top, y2: bottom, class: 'market-history-guide' }); svg.append(guide);
    let active = series.dates.length - 1;
    const show = (i: number) => {
        active = i; guide.setAttribute('x1', String(x(i))); guide.setAttribute('x2', String(x(i)));
        const date = series.dates[i], close = series.close[i], mean = series.consensus[i];
        const parts = [date, `${zh ? '收盤' : 'Close'} ${close === null ? '—' : `${price(close)} ${currency}`}`,
            `${zh ? '共識均值' : 'Consensus mean'} ${mean?.mean != null ? price(mean.mean) : '—'}${mean?.analysts ? ` · ${mean.analysts} ${zh ? '位分析師' : 'analysts'}` : ''}`];
        for (const dot of series.dots.filter(d => d.date === date)) {
            parts.push(`${dot.firm} ${dot.action.rating ?? ''} ${price(dot.target)}${dot.action.previousTarget ? ` (${zh ? '前' : 'prev'} ${price(dot.action.previousTarget)})` : ''}`.replace(/\s+/g, ' '));
        }
        for (const view of shownViews.filter(v => viewIndex(v.date!) === i)) parts.push(`${view.publisher} ${direction(view.direction)[zh ? 0 : 1]}：${view.claim}`);
        readout.replaceChildren(...parts.map(text => { const span = document.createElement('span'); span.textContent = text; return span; }));
    };
    const indexAt = (clientX: number) => {
        const rect = svg.getBoundingClientRect();
        return Math.max(0, Math.min(series.dates.length - 1, Math.floor(((clientX - rect.left) / Math.max(rect.width, 1) * width - left) / slot)));
    };
    svg.addEventListener('pointermove', event => show(indexAt(event.clientX)));
    svg.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        show(event.key === 'Home' ? 0 : event.key === 'End' ? series.dates.length - 1 : Math.max(0, Math.min(series.dates.length - 1, active + (event.key === 'ArrowLeft' ? -1 : 1))));
    });
    bindChartZoom(svg, targetId, allDates, redraw, { left: left / width, right: right / width });
    show(active);
    const legend = document.createElement('p'); legend.className = 'market-updated market-target-legend';
    const swatch = (color: string, label: string) => { const span = document.createElement('span'); span.style.color = color; span.textContent = `● ${label}`; return span; };
    legend.append(swatch(CLOSE, zh ? '收盤價' : 'Close'), swatch(CONSENSUS, zh ? '共識均值（區間＝最高／最低）' : 'Consensus mean (band = high/low)'),
        ...[...colors].map(([firm, color]) => swatch(color, firm)), ...(series.dots.some(d => !colors.has(d.firm)) ? [swatch(OTHER, zh ? '其他券商' : 'Other brokers')] : []));
    // Clicking a broker (dot or table row) shows the reasoning behind that call and the report claims linked to it.
    const detail = document.createElement('section'); detail.className = 'market-target-detail'; detail.hidden = true; detail.setAttribute('aria-live', 'polite');
    function viewItem(view: TargetView) {
        const li = document.createElement('li');
        const [zhLabel, enLabel, tone] = direction(view.direction);
        const badge = document.createElement('span'); badge.className = `market-target-view-badge ${tone}`; badge.textContent = zh ? zhLabel : enLabel;
        const kind = view.dateKind === 'recorded' ? (zh ? '（入庫日）' : ' (recorded)') : view.dateKind === 'data' ? (zh ? '（資料截點）' : ' (data date)') : '';
        const head = document.createElement('strong'); head.textContent = `${view.date ?? (zh ? '未標日期' : 'undated')}${kind} · ${view.publisher || (zh ? '未標示出版者' : 'publisher not stated')}`;
        const text = document.createElement('p'); text.textContent = view.claim;
        const source = document.createElement('small'); source.textContent = `《${view.title}》 p.${view.page} · ${view.evidence}`;
        li.append(badge, head, text, source);
        return li;
    }
    function showDetail(action: TargetAction) {
        detail.hidden = false; detail.replaceChildren();
        const title = document.createElement('h5');
        title.textContent = [action.firm, action.date, action.rating, action.target ? `${price(action.target)} ${action.currency}` : null,
            action.previousTarget ? `(${zh ? '前' : 'prev'} ${price(action.previousTarget)})` : null].filter(Boolean).join(' · ');
        const thesis = document.createElement('p');
        thesis.textContent = action.thesis || (zh ? '這筆沒有記錄理由（Yahoo 只提供評等與目標價；新聞來源的由 AI 排程補理由）。' : 'No reasoning recorded (Yahoo gives only the rating and target; the AI routine adds reasons for news sources).');
        const link = document.createElement('a'); link.href = action.sourceUrl; link.target = '_blank'; link.rel = 'noopener noreferrer';
        link.textContent = action.source === 'yahoo' ? 'Yahoo' : (zh ? '來源' : 'Source');
        detail.append(title, thesis, link);
        const linked = actionViews(action, views);
        if (linked.length) {
            const list = document.createElement('ul'); list.className = 'market-target-view-list';
            linked.forEach(view => list.append(viewItem(view)));
            const heading = document.createElement('h6'); heading.textContent = zh ? '同一份報告的看法' : 'Views from the same report';
            detail.append(heading, list);
        }
    }
    target.append(svg, readout, legend, detail);
    const last = options.closes.length ? [...options.closes].sort((a, b) => a.date.localeCompare(b.date)).at(-1)! : null;
    const rows = latestTargets(options.actions, last);
    const viewsSection = () => {
        const section = document.createElement('section'); section.className = 'market-target-views';
        const heading = document.createElement('h5'); heading.textContent = zh ? '報告看法（時間軸下方的菱形）' : 'Report views (diamonds under the chart)';
        section.append(heading);
        if (!views.length) {
            const empty = document.createElement('p'); empty.className = 'market-updated';
            empty.textContent = zh ? '尚無提到這檔股票的公開報告主張。' : 'No public report claims mention this stock yet.';
            section.append(empty);
        } else {
            const list = document.createElement('ul'); list.className = 'market-target-view-list';
            [...views].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')).forEach(view => list.append(viewItem(view)));
            section.append(list);
        }
        return section;
    };
    if (!rows.length) {
        const note = document.createElement('p'); note.className = 'market-updated';
        note.textContent = zh ? '沒有個別券商的目標價紀錄，只有共識均值與區間；台股與日股的個別券商目標價由 AI 排程從新聞補入。'
            : 'No per-broker targets yet, only the consensus; Taiwan and Japan broker targets are added from news by the AI routine.';
        target.append(note, viewsSection()); return;
    }
    const table = document.createElement('table'); table.className = 'market-target-table';
    const head = table.createTHead().insertRow();
    (zh ? ['券商', '日期', '評等', '目標價', '調整', '距收盤', '來源'] : ['Broker', 'Date', 'Rating', 'Target', 'Change', 'Upside', 'Source'])
        .forEach(label => { const th = document.createElement('th'); th.textContent = label; head.append(th); });
    const body = table.createTBody();
    for (const row of rows) {
        const tr = body.insertRow(); if (row.stale) tr.className = 'market-target-stale';
        tr.tabIndex = 0; tr.classList.add('market-target-row');
        tr.addEventListener('click', () => showDetail(row));
        tr.addEventListener('keydown', event => { if (event.key === 'Enter') showDetail(row); });
        const link = document.createElement('a'); link.href = row.sourceUrl; link.target = '_blank'; link.rel = 'noopener noreferrer';
        link.textContent = row.source === 'yahoo' ? 'Yahoo' : (zh ? '新聞' : 'News');
        const cells: Array<string | Node> = [row.firm, `${row.date}${row.stale ? (zh ? '（逾一年）' : ' (over a year old)') : ''}`, row.rating ?? '—',
            `${price(row.target)} ${row.currency}`, percent(row.change), percent(row.upside), link];
        cells.forEach(value => { const td = tr.insertCell(); td.append(value); });
    }
    target.append(table, viewsSection());
}
