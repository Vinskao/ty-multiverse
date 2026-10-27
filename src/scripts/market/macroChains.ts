// Macro logic chains: rows of charts that branch left to right and converge on a few focus variables.
// The graph lives in src/storages/macroLogicGraph.json; this module validates and lays it out, and reads each
// node's stance. Rendering is in ./macroChainView.ts. Covered by tests/market/macroChains.test.ts.
import { resolveMacroCode } from './macroSeries';

export type MacroText = { zh: string; en: string };
export type MacroChainNode = { id: string; row?: string; stage?: number; title: MacroText; series: string[]; question: MacroText };
export type MacroChainEdge = { from: string; to: string; mechanism: MacroText };
export type MacroChainRow = { id: string; title: MacroText; thesis: MacroText };
export type MacroGraph = { version: string; rows: MacroChainRow[]; focus: MacroChainNode[]; nodes: MacroChainNode[]; edges: MacroChainEdge[] };
export type MacroStance = 'tailwind' | 'neutral' | 'headwind';

/** Problems that would break the drawing or the convergence; an empty list means the graph is usable. */
export function validateMacroGraph(graph: MacroGraph, knownCodes: ReadonlySet<string>): string[] {
    const errors: string[] = [];
    const seen = new Set<string>();
    const focusIds = new Set(graph.focus.map((node) => node.id));
    const rows = new Set(graph.rows.map((row) => row.id));
    const byId = new Map<string, MacroChainNode>();
    for (const node of [...graph.nodes, ...graph.focus]) {
        if (seen.has(node.id)) errors.push(`${node.id}: duplicate id`);
        seen.add(node.id); byId.set(node.id, node);
        if (!/^[a-z0-9-]{1,24}$/.test(node.id)) errors.push(`${node.id}: id must be 1-24 of a-z, 0-9 and "-"`);
        if (!node.series.length) errors.push(`${node.id}: no series`);
        for (const choice of node.series) for (const code of choice.split('|'))
            if (!knownCodes.has(code)) errors.push(`${node.id}: unknown series ${code}`);
    }
    for (const node of graph.nodes) {
        if (!node.row || !rows.has(node.row)) errors.push(`${node.id}: unknown row ${node.row}`);
        if (!Number.isInteger(node.stage) || node.stage! < 0) errors.push(`${node.id}: stage must be a whole number from 0`);
    }
    for (const edge of graph.edges) {
        const from = byId.get(edge.from), to = byId.get(edge.to);
        if (!from || !to) { errors.push(`${edge.from} → ${edge.to}: unknown node`); continue; }
        if (focusIds.has(edge.from)) errors.push(`${edge.from} → ${edge.to}: focus nodes are the end of a chain`);
        else if (!focusIds.has(edge.to) && !(to.stage! > from.stage!)) errors.push(`${edge.from} → ${edge.to}: edges must go to a later stage or a focus node`);
    }
    // Convergence: every chart must lead, through some branch, to at least one focus variable.
    const reaches = new Map<string, boolean>();
    const reachesFocus = (id: string, path = new Set<string>()): boolean => {
        if (focusIds.has(id)) return true;
        if (reaches.has(id)) return reaches.get(id)!;
        if (path.has(id)) return false;
        path.add(id);
        const result = graph.edges.some((edge) => edge.from === id && byId.has(edge.to) && reachesFocus(edge.to, path));
        reaches.set(id, result);
        return result;
    };
    for (const node of graph.nodes) if (!reachesFocus(node.id)) errors.push(`${node.id}: does not reach a focus node`);
    return errors;
}

/** Rows in graph order, each split into stage columns (nodes in graph order within a column), plus the focus column. */
export function layoutMacroGraph(graph: MacroGraph) {
    const stages = Math.max(0, ...graph.nodes.map((node) => node.stage ?? 0)) + 1;
    return {
        stages,
        rows: graph.rows.map((row) => ({
            row,
            columns: Array.from({ length: stages }, (_, stage) => graph.nodes.filter((node) => node.row === row.id && node.stage === stage)),
        })),
        focus: graph.focus,
    };
}

export function macroNodeLinks(graph: MacroGraph, id: string) {
    return { incoming: graph.edges.filter((edge) => edge.to === id), outgoing: graph.edges.filter((edge) => edge.from === id) };
}

/** The routine writes "【判讀】順風｜中性｜逆風" as the first line of every node analysis. */
export function parseStance(content: string | null | undefined): MacroStance | null {
    const first = (content ?? '').trimStart().split('\n')[0];
    const match = first.match(/^【判讀】\s*(順風|中性|逆風)/);
    return match ? ({ 順風: 'tailwind', 中性: 'neutral', 逆風: 'headwind' } as const)[match[1] as '順風' | '中性' | '逆風'] : null;
}

/** The series a node's chart draws: "a|b" becomes the first code with data. */
export function chartCodes(node: Pick<MacroChainNode, 'series'>, hasData: (code: string) => boolean): string[] {
    return node.series.map((choice) => resolveMacroCode(choice, hasData));
}
