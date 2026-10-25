import { formatNumber } from '../format/numbers';
import { RESEARCH_DIMENSIONS, researchLeanTone, researchViewTone, type ResearchRecord } from './researchMap';

/** Render saved, validated content. Returns only diagram nodes that actually need Mermaid. */
export function renderResearchContent(target: HTMLElement, record: ResearchRecord, lang: 'en' | 'zh'): HTMLElement[] {
    const t = (en: string, zh: string) => lang === 'zh' ? zh : en;
    const el = (tag: string, className = '', text?: string) => {
        const node = document.createElement(tag); node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    };
    const link = (label: string, url: string) => {
        const node = document.createElement('a');
        node.href = url; node.target = '_blank'; node.rel = 'noopener noreferrer'; node.textContent = label;
        return node;
    };
    const diagrams: HTMLElement[] = [];
    target.append(el('h5', '', record.name));
    if (record.kind === 'etf') {
        const labels = {
            holdings: t('Holdings allocation', '持股分配'), sectors: t('Sector allocation', '產業分配'),
            regions: t('Region allocation', '地區分配'), assets: t('Asset allocation', '資產分配'),
            derivatives: t('Derivatives (separate disclosure)', '衍生品（獨立揭露）'),
        };
        for (const group of record.allocations) {
            const section = el('section', 'market-research-allocation');
            section.append(el('h5', '', labels[group.dimension]));
            const coverage = group.coverage === 'complete' ? t('Full disclosure', '完整披露')
                : group.coverage === 'partial' ? t('Partial disclosure; not normalized to 100%', '部分披露；未補足或正規化為 100%')
                    : t('Not available', '尚未取得');
            section.append(el('p', 'market-updated', `${group.asOf ?? t('Date unavailable', '日期尚未取得')} · ${coverage} · ${group.denominator}`));
            if (group.items.length) {
                // Tables expose every exact value on desktop, touch and keyboard without a hover dependency.
                const table = document.createElement('table');
                const caption = document.createElement('caption'); caption.textContent = `${labels[group.dimension]} · ${group.asOf}`;
                table.append(caption);
                const head = document.createElement('thead'); const row = document.createElement('tr');
                for (const title of [t('Item', '項目'), t('Allocation (%)', '比例（%）')]) {
                    const th = document.createElement('th'); th.scope = 'col'; th.textContent = title; row.append(th);
                }
                head.append(row); table.append(head);
                const body = document.createElement('tbody');
                for (const item of group.items) {
                    const row = document.createElement('tr');
                    const name = document.createElement('th'); name.scope = 'row'; name.textContent = item.name;
                    row.append(name, el('td', '', formatNumber(item.weightPercent, 'percent')));
                    body.append(row);
                }
                table.append(body); section.append(table);
            }
            section.append(link(group.sourceLabel, group.sourceUrl)); target.append(section);
        }
    }
    const analysis = record.kind === 'etf' ? record.themeResearch : record;
    if (analysis) {
        if (record.kind === 'etf') target.append(el('h5', '', `${t('Theme research', '主題研究')}：${record.theme}`));
        const head = el('div', 'market-research-head');
        head.append(el('span', `market-research-lean market-research-tone--${researchLeanTone(analysis.lean)}`, `${t('Lean', '偏向')}：${analysis.lean}`));
        const grid = el('div', 'market-research-dimensions');
        for (const dimension of RESEARCH_DIMENSIONS) {
            const item = analysis.assessment[dimension.key]; const card = el('article', 'market-research-dimension');
            card.append(el('span', '', dimension.label[lang]), el('strong', `market-research-tone--${researchViewTone(item.view)}`, item.view), el('p', '', item.note));
            grid.append(card);
        }
        const diagram = (title: string, source: string) => {
            const section = el('section', 'market-research-diagram'); const pre = el('pre', 'mermaid', source);
            diagrams.push(pre); section.append(el('h5', '', title), pre); return section;
        };
        target.append(head, el('p', 'market-research-summary', analysis.summary), grid,
            el('p', 'market-research-reason', analysis.leanReason),
            diagram(t('Supply chain', '供應鏈環節'), analysis.supplyChain), diagram(t('Technology roadmap', '技術環節與量產狀態'), analysis.technology));
        if (analysis.watch.length) {
            const list = el('ul', 'market-research-watch'); analysis.watch.forEach((item) => list.append(el('li', '', item)));
            target.append(el('h5', '', t('Watch next', '接下來觀察')), list);
        }
    }
    const sources = record.kind === 'etf' && analysis ? [...record.sources, ...analysis.sources] : record.sources;
    if (sources.length) {
        const links = el('p', 'market-updated');
        sources.forEach((source, index) => { if (index) links.append(document.createTextNode(' · ')); links.append(link(source.label, source.url)); });
        target.append(links);
    }
    if (record.basis) target.append(el('p', 'market-updated', record.basis));
    if (record.kind === 'etf' && analysis?.basis) target.append(el('p', 'market-updated', analysis.basis));
    return diagrams;
}
