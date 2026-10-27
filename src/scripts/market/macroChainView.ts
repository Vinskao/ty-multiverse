// Each themed chain scrolls independently; convergence stays above the chains.
// SVG connectors are local to a chain. Links to convergence retain their explicit destination buttons.
import { layoutMacroGraph, macroNodeLinks, parseStance, type MacroChainNode, type MacroGraph, type MacroStance } from './macroChains';
import { chainScrollTarget } from './macroChainNavigation';

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

    const view = el('div', 'macro-chains-view');
    const rowViews: Array<{ grid: HTMLElement; svg: SVGSVGElement; updateControls: () => void }> = [];
    const motion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'instant' as const : 'smooth' as const;

    const card = (node: MacroChainNode, focus = false) => {
        const article = el('article', `macro-node${focus ? ' macro-node--focus' : ''}`);
        article.id = `macro-node-${node.id}`; article.dataset.node = node.id; article.tabIndex = -1;
        if (node.row) article.dataset.theme = node.row;
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
            // The routine sometimes stores a literal backslash-n instead of a line break (seen in production 2026-10-27).
            const lines = analysis.content.replace(/\\n/g, '\n').split('\n').filter((line) => line.trim());
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
            body.append(el('p', 'macro-node-pending', zh ? '分析待寫入：資料有新公布時，早上的總經排程會補上（日資料每週六更新一次）。' : 'Analysis pending: the morning macro routine writes it when new data is released (daily series once a week, on Saturday).'));
        }
        article.append(body);

        const outgoing = macroNodeLinks(graph, node.id).outgoing;
        if (outgoing.length) {
            const next = el('ul', 'macro-node-next');
            for (const edge of outgoing) {
                const item = el('li');
                const jump = el('button', focusIds.has(edge.to) ? 'is-focus' : '', `→ ${titleOf.get(edge.to)}`) as HTMLButtonElement;
                jump.type = 'button'; jump.dataset.target = edge.to;
                jump.addEventListener('click', () => {
                    const destination = document.getElementById(`macro-node-${edge.to}`);
                    destination?.scrollIntoView({ behavior: motion(), block: 'nearest', inline: 'center' });
                    destination?.focus({ preventScroll: true });
                });
                item.append(jump, el('span', undefined, t(edge.mechanism)));
                next.append(item);
            }
            article.append(next);
        }
        const related = () => new Set([node.id, ...graph.edges.flatMap((edge) => edge.from === node.id ? [edge.to] : edge.to === node.id ? [edge.from] : [])]);
        const highlight = (on: boolean) => {
            const scope = article.closest<HTMLElement>('.macro-chain-row, .macro-chain-overview');
            if (!scope) return;
            scope.classList.toggle('has-active', on);
            const ids = related();
            scope.querySelectorAll<HTMLElement>('.macro-node').forEach((other) => other.classList.toggle('is-related', on && ids.has(other.dataset.node!)));
            scope.querySelectorAll<SVGPathElement>('.macro-edge').forEach((path) =>
                path.classList.toggle('is-related', on && (path.dataset.from === node.id || path.dataset.to === node.id)));
        };
        article.addEventListener('pointerenter', () => highlight(true));
        article.addEventListener('pointerleave', () => highlight(false));
        article.addEventListener('focusin', () => highlight(true));
        article.addEventListener('focusout', () => highlight(false));
        return article;
    };

    const rows = el('div', 'macro-chain-rows');
    layout.rows.forEach(({ row, columns }, index) => {
        const section = el('section', 'macro-chain-row');
        section.dataset.chain = row.id; section.dataset.theme = row.id;
        const titleId = `macro-chain-title-${row.id}`;
        section.setAttribute('aria-labelledby', titleId);
        const head = el('header', 'macro-chain-head');
        const summary = el('div', 'macro-chain-summary');
        const title = el('h5', undefined, t(row.title)); title.id = titleId;
        summary.append(el('span', 'macro-chain-index', String(index + 1).padStart(2, '0')), title, el('p', undefined, t(row.thesis)));
        const controls = el('div', 'macro-chain-controls');
        const jumpSelect = el('select');
        jumpSelect.setAttribute('aria-label', `${t(row.title)}：${zh ? '跳至指標' : 'Jump to indicator'}`);
        const placeholder = el('option', undefined, zh ? '跳至指標' : 'Jump to indicator'); placeholder.value = '';
        jumpSelect.append(placeholder);
        columns.flat().forEach(node => { const option = el('option', undefined, t(node.title)); option.value = node.id; jumpSelect.append(option); });
        const arrows = el('div', 'macro-chain-arrows');
        const previous = el('button', undefined, '‹'); previous.type = 'button'; previous.dataset.chainPrevious = '';
        previous.setAttribute('aria-label', `${t(row.title)}：${zh ? '往左' : 'Scroll left'}`);
        const next = el('button', undefined, '›'); next.type = 'button'; next.dataset.chainNext = '';
        next.setAttribute('aria-label', `${t(row.title)}：${zh ? '往右' : 'Scroll right'}`);
        arrows.append(previous, next); controls.append(jumpSelect, arrows); head.append(summary, controls);
        const scroll = el('div', 'macro-chains-scroll');
        scroll.tabIndex = 0; scroll.setAttribute('role', 'region'); scroll.setAttribute('aria-labelledby', titleId);
        const grid = el('div', 'macro-chains-grid');
        const stages = columns.filter(nodes => nodes.length);
        grid.style.setProperty('--macro-stages', String(stages.length));
        stages.forEach(nodes => {
            const cell = el('div', 'macro-chain-cell');
            nodes.forEach((node) => cell.append(card(node)));
            grid.append(cell);
        });
        const updateControls = () => {
            const max = scroll.scrollWidth - scroll.clientWidth;
            arrows.hidden = max <= 1;
            previous.disabled = scroll.scrollLeft <= 1;
            next.disabled = scroll.scrollLeft >= max - 1;
        };
        const move = (direction: 'previous' | 'next') => {
            const left = grid.getBoundingClientRect().left;
            // Desktop cards can share a stage; mobile exposes each card as its own horizontal step.
            const offsets = [...grid.querySelectorAll<HTMLElement>('.macro-node')].map(node => node.getBoundingClientRect().left - left);
            scroll.scrollTo({ left: chainScrollTarget(offsets, scroll.scrollLeft, direction), behavior: motion() });
        };
        previous.addEventListener('click', () => move('previous'));
        next.addEventListener('click', () => move('next'));
        scroll.addEventListener('scroll', updateControls, { passive: true });
        scroll.addEventListener('keydown', event => {
            if (event.target !== scroll || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
            event.preventDefault(); move(event.key === 'ArrowLeft' ? 'previous' : 'next');
        });
        jumpSelect.addEventListener('change', () => {
            const destination = [...grid.querySelectorAll<HTMLElement>('.macro-node')].find(node => node.dataset.node === jumpSelect.value);
            if (!destination) return;
            scroll.scrollTo({ left: destination.getBoundingClientRect().left - grid.getBoundingClientRect().left, behavior: motion() });
            // Only a lower card in a desktop stage needs vertical navigation. Mobile cards share one row.
            if (destination.offsetTop > 0) destination.scrollIntoView({ behavior: motion(), block: 'nearest', inline: 'start' });
            destination.focus({ preventScroll: true });
        });
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'macro-chain-edges'); svg.setAttribute('aria-hidden', 'true');
        grid.prepend(svg); scroll.append(grid); section.append(head, scroll); rows.append(section);
        rowViews.push({ grid, svg, updateControls });
    });
    const focus = el('section', 'macro-chain-focus');
    focus.setAttribute('aria-label', zh ? '收斂：個股要盯的總經變數' : 'Where macro chains converge');
    focus.append(el('h5', 'macro-chain-focus-title', zh ? '收斂：個股要盯的總經變數' : 'Where it converges: the macro variables a stock depends on'));
    layout.focus.forEach((node) => focus.append(card(node, true)));

    function drawEdges() {
      for (const { grid, svg, updateControls } of rowViews) {
        updateControls();
        const box = grid.getBoundingClientRect();
        svg.setAttribute('width', String(grid.offsetWidth)); svg.setAttribute('height', String(grid.offsetHeight));
        svg.replaceChildren();
        for (const edge of graph.edges) {
            if (focusIds.has(edge.to)) continue;
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
    }

    const overview = el('div', 'macro-chain-overview');
    overview.append(focus);
    view.append(overview, rows); target.replaceChildren(view);
    resizeObserver?.disconnect();
    resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(() => drawEdges()) : null;
    rowViews.forEach(({ grid }) => resizeObserver?.observe(grid));
    requestAnimationFrame(drawEdges);
    return { drawEdges };
}
