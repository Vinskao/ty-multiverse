import { describe, expect, it } from 'vitest';
import graph from '../../src/storages/macroLogicGraph.json';
import frequencies from '../fixtures/macro-series-frequencies.json';
import { MACRO_GROUP_SPECS } from '../../src/scripts/market/macroGroups';
import { chartCodes, layoutMacroGraph, macroNodeLinks, parseStance, validateMacroGraph, type MacroGraph } from '../../src/scripts/market/macroChains';

const known = new Set(MACRO_GROUP_SPECS.flatMap((group) => group.metrics.map((metric) => metric.code)));
const g = graph as MacroGraph;
const clone = (): MacroGraph => JSON.parse(JSON.stringify(graph));

describe('the macro logic graph (src/storages/macroLogicGraph.json)', () => {
    it('is valid: known series, existing nodes, left-to-right edges, every branch converging on a focus node', () => {
        expect(validateMacroGraph(g, known)).toEqual([]);
    });

    it('has one root per row and focus nodes fed by at least two different chains', () => {
        for (const row of g.rows) expect(g.nodes.filter((node) => node.row === row.id && node.stage === 0)).toHaveLength(1);
        for (const focus of g.focus) {
            const rows = new Set(macroNodeLinks(g, focus.id).incoming.map((edge) => g.nodes.find((node) => node.id === edge.from)!.row));
            expect(rows.size, focus.id).toBeGreaterThanOrEqual(2);
        }
    });

    it('puts Korea trade data in the default logic-chain view as an electronics-cycle cross-check', () => {
        expect(g.rows.find((row) => row.id === 'korea')?.title.zh).toContain('韓國');
        const node = g.nodes.find((item) => item.id === 'korea-trade');
        expect(node?.series).toEqual(['XTEXVA01KRM667S', 'XTIMVA01KRM667S']);
        expect(g.edges).toContainEqual(expect.objectContaining({ from: 'korea-trade', to: 'focus-demand' }));
    });

    it('draws Taiwan margin maintenance and VIX together in the convergence section', () => {
        // 2026-10-29: the owner asked for the two on one chart under 「收斂：個股要盯的總經變數」, not only in the indicator grid.
        const node = g.focus.find((item) => item.id === 'focus-leverage');
        expect(node?.series).toEqual(['TW_MARGIN_MAINTENANCE', 'US_VIX']);
        expect(node?.title.zh).toContain('融資維持率');
        expect(node?.title.zh).toContain('VIX');
    });

    it('never mixes monthly (YYYY-MM) and dated series in one chart, which would interleave periods out of order', () => {
        const series = (frequencies as any).series as Record<string, { lastPeriod: string }>;
        for (const node of [...g.nodes, ...g.focus]) {
            const shapes = new Set(chartCodes(node, (code) => code in series).map((code) => /^\d{4}-\d{2}$/.test(series[code].lastPeriod) ? 'month' : 'date'));
            expect(shapes.size, node.id).toBeLessThanOrEqual(1);
        }
    });

    it('uses ids the analysis API accepts (A-Z, 0-9 and "-", at most 24 characters once upper-cased)', () => {
        for (const node of [...g.nodes, ...g.focus]) expect(node.id.toUpperCase()).toMatch(/^[A-Z0-9-]{1,24}$/);
    });
});

describe('validateMacroGraph', () => {
    it('reports unknown series, missing nodes, backward edges, dead ends and duplicate ids', () => {
        const bad = clone();
        bad.nodes[0].series = ['NOPE'];
        bad.edges.push({ from: 'oil', to: 'core-inflation', mechanism: { zh: '', en: '' } });
        bad.edges.push({ from: 'oil', to: 'missing', mechanism: { zh: '', en: '' } });
        bad.nodes.push({ ...bad.nodes[1] });
        bad.nodes.push({ id: 'island', row: 'rates', stage: 2, title: { zh: '孤島', en: 'Island' }, series: ['DGS10'], question: { zh: '', en: '' } });
        const errors = validateMacroGraph(bad, known).join('\n');
        expect(errors).toContain('core-inflation: unknown series NOPE');
        expect(errors).toContain('oil → core-inflation: edges must go to a later stage or a focus node');
        expect(errors).toContain('oil → missing: unknown node');
        expect(errors).toContain('producer-prices: duplicate id');
        expect(errors).toContain('island: does not reach a focus node');
    });
});

describe('layout and analysis', () => {
    it('lays each row out in stage columns and keeps the focus nodes in their own column', () => {
        const layout = layoutMacroGraph(g);
        expect(layout.rows.map((row) => row.row.id)).toEqual(['inflation', 'rates', 'liquidity', 'growth', 'taiwan', 'korea']);
        const inflation = layout.rows[0].columns.map((column) => column.map((node) => node.id));
        expect(inflation).toEqual([['core-inflation'], ['producer-prices'], ['oil'], ['fed-policy']]);
        expect(layout.rows[1].columns[1].map((node) => node.id)).toEqual(['curve-spread', 'real-yield', 'global-rates']);
        expect(layout.focus.map((node) => node.id)).toEqual(['focus-discount', 'focus-demand', 'focus-risk', 'focus-fx', 'focus-leverage']);
    });

    it('reads the stance from the first line of a node analysis', () => {
        expect(parseStance('【判讀】逆風\n核心 CPI 3.1%')).toBe('headwind');
        expect(parseStance('  【判讀】順風（AI 資本支出）')).toBe('tailwind');
        expect(parseStance('【判讀】中性')).toBe('neutral');
        expect(parseStance('核心 CPI 3.1%\n【判讀】逆風')).toBeNull(); // only the first line counts
        expect(parseStance(null)).toBeNull();
    });

    it('resolves "a|b" to the first series with data', () => {
        const gold = g.nodes.find((node) => node.id === 'gold')!;
        expect(chartCodes(gold, (code) => code === 'WORLD_GOLD_USD')).toEqual(['WORLD_GOLD_USD']);
        expect(chartCodes(gold, () => true)).toEqual(['COMEX_GOLD_USD']);
    });
});

describe('renderMacroChains', () => {
    it('draws every row, convergence above the rows, analyses, and an actionable link for every graph relationship', async () => {
        const { renderMacroChains } = await import('../../src/scripts/market/macroChainView');
        document.body.innerHTML = '<div id="chains"></div>';
        const analyses = new Map([['CORE-INFLATION', { code: 'CORE-INFLATION', content: '【判讀】逆風\n資料截點：CPI 2026-09\n核心 CPI 年增 3.1%', model: 'Claude', revision: 2 }],
            ['FOCUS-DISCOUNT', { code: 'FOCUS-DISCOUNT', content: '【判讀】中性\n實質利率 1.9%' }]]);
        const charted: string[] = [];
        const { drawEdges } = renderMacroChains(document.getElementById('chains')!, { graph: g, zh: true, analyses,
            chart: (node) => { charted.push(node.id); const div = document.createElement('div'); div.className = 'stub-chart'; return div; } });
        expect(document.querySelectorAll('.macro-chain-head')).toHaveLength(6);
        expect(document.querySelector('.macro-chain-row[data-chain="korea"] .macro-node')?.id).toBe('macro-node-korea-trade');
        expect(document.querySelectorAll('.macro-chain-focus .macro-node--focus')).toHaveLength(g.focus.length); // five since focus-leverage (2026-10-29)
        expect(charted).toHaveLength(g.nodes.length + g.focus.length);
        const core = document.getElementById('macro-node-core-inflation')!;
        expect(core.dataset.stance).toBe('headwind');
        expect(core.querySelector('.macro-node-stance')!.textContent).toBe('逆風');
        expect(core.querySelector('.macro-node-analysis')!.textContent).toContain('核心 CPI 年增 3.1%');
        expect([...core.querySelectorAll('.macro-node-next button')].map((b) => b.textContent)).toEqual(['→ 上游成本', '→ Fed 政策利率與 SOFR']);
        expect(document.getElementById('macro-node-oil')!.querySelector('.macro-node-pending')).not.toBeNull();
        expect(document.getElementById('macro-node-focus-discount')!.dataset.stance).toBe('neutral');
        drawEdges();
        // Local SVG connectors stay inside independent rows; convergence now lives above them.
        const links = [...document.querySelectorAll<HTMLButtonElement>('.macro-node-next button')];
        expect(links).toHaveLength(g.edges.length);
        for (const edge of g.edges) {
            expect(links.some(link => link.closest<HTMLElement>('.macro-node')?.dataset.node === edge.from && link.dataset.target === edge.to), `${edge.from} → ${edge.to}`).toBe(true);
        }
        const localEdges = g.edges.filter(edge => !g.focus.some(node => node.id === edge.to));
        const paths = [...document.querySelectorAll<SVGPathElement>('.macro-edge')];
        expect(paths).toHaveLength(localEdges.length);
        for (const edge of localEdges) expect(paths.some(path => path.dataset.from === edge.from && path.dataset.to === edge.to)).toBe(true);
        expect(document.querySelector('.macro-chain-rows')?.previousElementSibling?.classList.contains('macro-chain-overview')).toBe(true);
    });
});

it('tells the routine to write two short sentences with a data cut-off, and to update only when data changes', () => {
    const format = (graph as any).analysisFormat;
    expect(format.zh).toContain('一到兩句話');
    expect(format.zh).toContain('資料截點：');
    expect(format.updateRule).toContain('新期間');
    expect(format.updateRule).toContain('週六');
});

it('shows a literal "\\n" written by the routine as a line break (production, 2026-10-27)', async () => {
    const { renderMacroChains } = await import('../../src/scripts/market/macroChainView');
    document.body.innerHTML = '<div id="chains"></div>';
    const content = '【判讀】順風\\n聖路易斯壓力指數 -0.63（週至 10/16），金融條件偏寬鬆。\\n資料截點：STLFSI4 2026-10-16、NFCI 2026-10-16';
    renderMacroChains(document.getElementById('chains')!, { graph: g, zh: true, chart: () => null,
        analyses: new Map([['FIN-STRESS', { code: 'FIN-STRESS', content }]]) });
    const node = document.getElementById('macro-node-fin-stress')!;
    expect(node.dataset.stance).toBe('tailwind');
    const lines = [...node.querySelectorAll('.macro-node-analysis-text p')].map((p) => p.textContent);
    expect(lines).toEqual(['【判讀】順風', '聖路易斯壓力指數 -0.63（週至 10/16），金融條件偏寬鬆。', '資料截點：STLFSI4 2026-10-16、NFCI 2026-10-16']);
});
