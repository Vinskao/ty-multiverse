// Per-instrument research maps (Research tab, before AI analysis); covered by tests/market/researchMap.test.ts.
// maya-sawa stores them as versioned JSON under productType=research and never deletes them, so research
// outlives an instrument leaving the holdings. Direction comes from cycle / technology / delivery; price and
// flows only time the entry.

import { analysisRecordCode } from './instrumentIdentity';

export type ResearchView = '順風' | '中性' | '逆風';
export type ResearchLean = '買' | '中立' | '賣';
type Assessment = { view: ResearchView; note: string };
export type ResearchRecord = {
    name: string; market: string; asOf: string; summary: string; supplyChain: string; technology: string;
    assessment: Record<'cycle' | 'technology' | 'delivery', Assessment>; lean: ResearchLean; leanReason: string;
    watch: string[]; sources: Array<{ label: string; url: string }>; basis?: string;
};

export const RESEARCH_DIMENSIONS = [
    { key: 'cycle', label: { en: 'Cycle', zh: '循環' } },
    { key: 'technology', label: { en: 'Technology', zh: '技術力' } },
    { key: 'delivery', label: { en: 'Delivery', zh: '交貨' } },
] as const;

const VIEWS = ['順風', '中性', '逆風'];
const LEANS = ['買', '中立', '賣'];
const text = (value: unknown) => typeof value === 'string' && value.trim() ? value.trim() : null;
const flowchart = (value: unknown) => { const source = text(value); return source && /^(flowchart|graph)\s/.test(source) ? source : null; };

export function parseResearchRecord(content: string): ResearchRecord | null {
    let data: any;
    try { data = JSON.parse(content); } catch { return null; }
    if (!data || typeof data !== 'object') return null;
    const supplyChain = flowchart(data.supplyChain), technology = flowchart(data.technology);
    if (!text(data.name) || !text(data.summary) || !supplyChain || !technology || !LEANS.includes(data.lean)) return null;
    const assessment = {} as ResearchRecord['assessment'];
    for (const { key } of RESEARCH_DIMENSIONS) {
        const item = data.assessment?.[key];
        if (!item || !VIEWS.includes(item.view) || !text(item.note)) return null;
        assessment[key] = { view: item.view, note: item.note };
    }
    return {
        name: data.name, market: text(data.market) || 'TW', asOf: text(data.asOf) || '', summary: data.summary,
        supplyChain, technology, assessment, lean: data.lean, leanReason: text(data.leanReason) || '',
        watch: Array.isArray(data.watch) ? data.watch.filter((item: unknown) => text(item)) : [],
        sources: Array.isArray(data.sources) ? data.sources.filter((source: any) => text(source?.label) && /^https:\/\//.test(String(source?.url))) : [],
        basis: text(data.basis) || undefined,
    };
}

// Same record identity as AI analysis: stock futures read their underlying stock's research.
export function researchRecordCode(item: { code: string; market?: string | null; productType?: string; underlyingCode?: string | null }) {
    return item.productType === 'futures' && item.underlyingCode ? item.underlyingCode.toUpperCase() : analysisRecordCode(item);
}

export function researchViewTone(view: string) {
    return view === '順風' ? 'up' : view === '逆風' ? 'down' : 'flat';
}

export function researchLeanTone(lean: string) {
    return lean === '買' ? 'up' : lean === '賣' ? 'down' : 'flat';
}

// Industry research (the Research Zone accordion, e.g. the datacenter DC power rack) belongs only to the
// instruments it is about; record codes of the makers each item covers.
export const INDUSTRY_RESEARCH: Record<string, readonly string[]> = {
    'power-rack': ['2308', '2301'], // Delta Electronics, Lite-On Technology
};

export function industryResearchFor(recordCode: string): string[] {
    return Object.keys(INDUSTRY_RESEARCH).filter((id) => INDUSTRY_RESEARCH[id].includes(recordCode));
}
