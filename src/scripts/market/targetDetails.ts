import { formatNumber } from '../format/numbers';
import { actionViews, latestTargets, type ClosePoint, type TargetAction, type TargetView } from './priceTargets';

type Options = { actions: TargetAction[]; closes: ClosePoint[]; currency: string; zh: boolean; views?: TargetView[] };
const DIRECTION: Record<string, [string, string, string]> = { tailwind: ['順風', 'Tailwind', 'market-delta--up'], neutral: ['中性', 'Neutral', ''], headwind: ['逆風', 'Headwind', 'market-delta--down'] };

/** What sits under the price chart: each broker's latest target (click one for its reasoning) and the public report views.
 *  The lines themselves are drawn by the price chart, on its own price axis. */
export function renderTargetDetails(targetId: string, options: Options) {
    const target = document.getElementById(targetId); if (!target) return;
    const { zh } = options;
    const locale = zh ? 'zh-TW' : 'en-US';
    const price = (value: number) => formatNumber(value, 'decimal', { locale });
    const percent = (value: number | null) => value === null ? '—' : formatNumber(value * 100, 'percent', { signed: true, locale });
    target.replaceChildren();
    const views = options.views ?? [];
    const direction = (value: string) => DIRECTION[value] ?? DIRECTION.neutral;
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
        if (view.sourceUrl) {
            const origin = document.createElement('a'); origin.href = view.sourceUrl; origin.target = '_blank'; origin.rel = 'noopener noreferrer';
            origin.textContent = zh ? '原文 ↗' : 'Original ↗'; li.append(origin);
        }
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
    const last = options.closes.length ? [...options.closes].sort((a, b) => a.date.localeCompare(b.date)).at(-1)! : null;
    const rows = latestTargets(options.actions, last);
    const viewsSection = () => {
        const section = document.createElement('section'); section.className = 'market-target-views';
        const heading = document.createElement('h5'); heading.textContent = zh ? '報告看法' : 'Report views';
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
        target.append(note, viewsSection(), detail); return;
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
    target.append(detail, table, viewsSection());
}
