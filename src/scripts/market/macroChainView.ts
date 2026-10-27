// Draws the macro logic chains: one row per chain, nodes in stage columns, the focus column on the right, and
// SVG connectors measured from the laid-out cards. Graph rules and stance parsing are in ./macroChains.ts.
import { layoutMacroGraph, macroNodeLinks, parseStance, type MacroChainNode, type MacroGraph, type MacroStance } from './macroChains';

export type MacroNodeAnalysis = { code: string; content: string; model?: string; updatedAt?: string; revision?: number };
type Options = {
    graph: MacroGraph;
    zh: boolean;
    analyses: ReadonlyMap<string, MacroNodeAnalysis>;
    chart: (node: MacroChainNode) => HTMLElement | null;
};

const STANCE_TEXT: Record<MacroStance, [string, string]> = { tailwind: ['順風', 'Tailwind'], neutral: ['中性', 'Neutral'], headwind: ['逆風', 'Headwind'] };
const STANCE_CLASS: Record<MacroStance, string> = { tailwind: 'market-delta--up', neutral: '', headwind: 'market-delta--down' };
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
};

let resizeObserver: ResizeObserver | null = null;

export function renderMacroChains(target: HTMLElement, options: Options) {
    const { graph, zh, analyses } = options;
    const t = (text: { zh: string; en: string }) => (zh ? text.zh : text.en);
    const layout = layoutMacroGraph(graph);
    const titleOf = new Map([...graph.nodes, ...graph.focus].map((node) => [node.id, t(node.title)]));
    const focusIds = new Set(graph.focus.map((node) => node.id));

    const grid = el('div', 'macro-chains-grid');
    grid.style.setProperty('--macro-stages', String(layout.stages));
    grid.style.setProperty('--macro-rows', String(layout.rows.length));

    const card = (node: MacroChainNode, focus = false) => {
        const article = el('article', `macro-node${focus ? ' macro-node--focus' : ''}`);
        article.id = `macro-node-${node.id}`; article.dataset.node = node.id; article.tabIndex = -1;
        const analysis = analyses.get(node.id.toUpperCase());
        const stance = parseStance(analysis?.content);
        const head = el('header', 'macro-node-head');
        if (stance) {
            const badge = el('span', `macro-node-stance ${STANCE_CLASS[stance]}`, zh ? STANCE_TEXT[stance][0] : STANCE_TEXT[stance][1]);
            article.dataset.stance = stance; head.append(badge);
        }
        head.append(el('h6', undefined, t(node.title)));
        article.append(head, el('p', 'macro-node-question', t(node.question)));
        const chart = options.chart(node);
        article.append(chart ?? el('p', 'macro-trend-empty', zh ? '這個節點的資料還沒收集到。' : 'No data collected for this node yet.'));

        const body = el('section', 'macro-node-analysis');
        if (analysis?.content) {
            const lines = analysis.content.split('\n').filter((line) => line.trim());
            const text = el('div', 'macro-node-analysis-text');
            lines.forEach((line) => text.append(el('p', undefined, line)));
            body.append(text);
            if (lines.length > 6) {
                const more = el('button', 'macro-node-more', zh ? '展開全文' : 'Read all') as HTMLButtonElement;
                more.type = 'button';
                more.addEventListener('click', () => {
                    const open = body.classList.toggle('is-open');
                    more.textContent = open ? (zh ? '收起' : 'Show less') : (zh ? '展開全文' : 'Read all');
                    drawEdges();
                });
                body.append(more);
            }
            const meta = [analysis.model, analysis.updatedAt ? new Date(analysis.updatedAt).toLocaleString(zh ? 'zh-TW' : 'en-US', { timeZone: 'Asia/Taipei' }) : '',
                analysis.revision ? `rev ${analysis.revision}` : ''].filter(Boolean).join(' · ');
            if (meta) body.append(el('small', 'macro-node-meta', meta));
        } else {
            body.append(el('p', 'macro-node-pending', zh ? '分析待寫入：每個交易日早上的總經排程會更新。' : 'Analysis pending: the morning macro routine updates it every trading day.'));
        }
        article.append(body);

        const outgoing = macroNodeLinks(graph, node.id).outgoing;
        if (outgoing.length) {
            const next = el('ul', 'macro-node-next');
            for (const edge of outgoing) {
                const item = el('li');
                const jump = el('button', focusIds.has(edge.to) ? 'is-focus' : '', `→ ${titleOf.get(edge.to)}`) as HTMLButtonElement;
                jump.type = 'button';
                jump.addEventListener('click', () => {
                    const destination = document.getElementById(`macro-node-${edge.to}`);
                    destination?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                    destination?.focus({ preventScroll: true });
                });
                item.append(jump, el('span', undefined, t(edge.mechanism)));
                next.append(item);
            }
            article.append(next);
        }
        const related = () => new Set([node.id, ...graph.edges.flatMap((edge) => edge.from === node.id ? [edge.to] : edge.to === node.id ? [edge.from] : [])]);
        const highlight = (on: boolean) => {
            grid.classList.toggle('has-active', on);
            const ids = related();
            grid.querySelectorAll<HTMLElement>('.macro-node').forEach((other) => other.classList.toggle('is-related', on && ids.has(other.dataset.node!)));
            grid.querySelectorAll<SVGPathElement>('.macro-edge').forEach((path) =>
                path.classList.toggle('is-related', on && (path.dataset.from === node.id || path.dataset.to === node.id)));
        };
        article.addEventListener('pointerenter', () => highlight(true));
        article.addEventListener('pointerleave', () => highlight(false));
        article.addEventListener('focusin', () => highlight(true));
        article.addEventListener('focusout', () => highlight(false));
        return article;
    };

    layout.rows.forEach(({ row, columns }, index) => {
        const head = el('header', 'macro-chain-head');
        head.style.gridRow = String(index + 1);
        head.append(el('span', 'macro-chain-index', String(index + 1).padStart(2, '0')), el('h5', undefined, t(row.title)), el('p', undefined, t(row.thesis)));
        grid.append(head);
        columns.forEach((nodes, stage) => {
            const cell = el('div', 'macro-chain-cell');
            cell.style.gridRow = String(index + 1); cell.style.gridColumn = String(stage + 2);
            nodes.forEach((node) => cell.append(card(node)));
            grid.append(cell);
        });
    });
    const focus = el('section', 'macro-chain-focus');
    focus.style.gridColumn = String(layout.stages + 2);
    focus.style.gridRow = `1 / span ${layout.rows.length}`;
    focus.append(el('h5', 'macro-chain-focus-title', zh ? '收斂：個股要盯的總經變數' : 'Where it converges: the macro variables a stock depends on'));
    layout.focus.forEach((node) => focus.append(card(node, true)));
    grid.append(focus);

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'macro-chain-edges'); svg.setAttribute('aria-hidden', 'true');
    grid.prepend(svg);

    function drawEdges() {
        const box = grid.getBoundingClientRect();
        svg.setAttribute('width', String(grid.scrollWidth)); svg.setAttribute('height', String(grid.scrollHeight));
        svg.replaceChildren();
        for (const edge of graph.edges) {
            const from = grid.querySelector<HTMLElement>(`[data-node="${edge.from}"]`)?.getBoundingClientRect();
            const to = grid.querySelector<HTMLElement>(`[data-node="${edge.to}"]`)?.getBoundingClientRect();
            if (!from || !to) continue;
            // Right edge of the source at its header, to the left edge of the target at its header.
            const x1 = from.right - box.left, y1 = from.top - box.top + 28, x2 = to.left - box.left, y2 = to.top - box.top + 28;
            const bend = Math.max(40, (x2 - x1) / 2);
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`);
            path.setAttribute('class', `macro-edge${focusIds.has(edge.to) ? ' macro-edge--focus' : ''}`);
            path.dataset.from = edge.from; path.dataset.to = edge.to;
            const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
            title.textContent = `${titleOf.get(edge.from)} → ${titleOf.get(edge.to)}：${t(edge.mechanism)}`;
            path.append(title);
            svg.append(path);
        }
    }

    const scroll = el('div', 'macro-chains-scroll');
    scroll.append(grid);
    target.replaceChildren(scroll);
    resizeObserver?.disconnect();
    resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(() => drawEdges()) : null;
    resizeObserver?.observe(grid);
    requestAnimationFrame(drawEdges);
    return { drawEdges };
}
