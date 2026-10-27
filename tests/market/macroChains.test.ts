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
        expect(layout.rows.map((row) => row.row.id)).toEqual(['inflation', 'rates', 'liquidity', 'growth', 'taiwan']);
        const inflation = layout.rows[0].columns.map((column) => column.map((node) => node.id));
        expect(inflation).toEqual([['core-inflation'], ['producer-prices'], ['oil'], ['fed-policy']]);
        expect(layout.rows[1].columns[1].map((node) => node.id)).toEqual(['curve-spread', 'real-yield', 'global-rates']);
        expect(layout.focus.map((node) => node.id)).toEqual(['focus-discount', 'focus-demand', 'focus-risk', 'focus-fx']);
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
    it('draws every row, the focus column, analyses with their stance, pending notes and the next-step links', async () => {
        const { renderMacroChains } = await import('../../src/scripts/market/macroChainView');
        document.body.innerHTML = '<div id="chains"></div>';
        const analyses = new Map([['CORE-INFLATION', { code: 'CORE-INFLATION', content: '【判讀】逆風\n資料截點：CPI 2026-09\n核心 CPI 年增 3.1%', model: 'Claude', revision: 2 }],
            ['FOCUS-DISCOUNT', { code: 'FOCUS-DISCOUNT', content: '【判讀】中性\n實質利率 1.9%' }]]);
        const charted: string[] = [];
        const { drawEdges } = renderMacroChains(document.getElementById('chains')!, { graph: g, zh: true, analyses,
            chart: (node) => { charted.push(node.id); const div = document.createElement('div'); div.className = 'stub-chart'; return div; } });
        expect(document.querySelectorAll('.macro-chain-head')).toHaveLength(5);
        expect(document.querySelectorAll('.macro-chain-focus .macro-node--focus')).toHaveLength(4);
        expect(charted).toHaveLength(g.nodes.length + g.focus.length);
        const core = document.getElementById('macro-node-core-inflation')!;
        expect(core.dataset.stance).toBe('headwind');
        expect(core.querySelector('.macro-node-stance')!.textContent).toBe('逆風');
        expect(core.querySelector('.macro-node-analysis')!.textContent).toContain('核心 CPI 年增 3.1%');
        expect([...core.querySelectorAll('.macro-node-next button')].map((b) => b.textContent)).toEqual(['→ 上游成本', '→ Fed 政策利率與 SOFR']);
        expect(document.getElementById('macro-node-oil')!.querySelector('.macro-node-pending')).not.toBeNull();
        expect(document.getElementById('macro-node-focus-discount')!.dataset.stance).toBe('neutral');
        drawEdges();
        expect(document.querySelectorAll('.macro-edge')).toHaveLength(g.edges.length);
        expect(document.querySelectorAll('.macro-edge--focus').length).toBe(g.edges.filter((edge) => edge.to.startsWith('focus-')).length);
    });
});

it('tells the routine to write two short sentences with a data cut-off, and to update only when data changes', () => {
    const format = (graph as any).analysisFormat;
    expect(format.zh).toContain('一到兩句話');
    expect(format.zh).toContain('資料截點：');
    expect(format.updateRule).toContain('新期間');
    expect(format.updateRule).toContain('週六');
});
