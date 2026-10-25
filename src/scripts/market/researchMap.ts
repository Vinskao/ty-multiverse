// Per-instrument research maps (Research tab, before AI analysis); covered by tests/market/researchMap.test.ts.
// maya-sawa stores them as versioned JSON under productType=research and never deletes them, so research
// outlives an instrument leaving the holdings. Direction comes from cycle / technology / delivery; price and
// flows only time the entry.

import { analysisRecordCode } from './instrumentIdentity';

export type ResearchView = '順風' | '中性' | '逆風';
export type ResearchLean = '買' | '中立' | '賣';
type Assessment = { view: ResearchView; note: string };
export type CompanyResearchRecord = {
    kind?: 'company';
    name: string; market: string; asOf: string; summary: string; supplyChain: string; technology: string;
    assessment: Record<'cycle' | 'technology' | 'delivery', Assessment>; lean: ResearchLean; leanReason: string;
    watch: string[]; sources: Array<{ label: string; url: string }>; basis?: string;
};
export type AllocationGroup = {
    dimension: 'holdings' | 'sectors' | 'regions' | 'assets' | 'derivatives';
    asOf: string | null; coverage: 'complete' | 'partial' | 'unavailable'; denominator: string;
    sourceLabel: string; sourceUrl: string; items: Array<{ name: string; weightPercent: number }>;
};
export type EtfResearchRecord = Pick<CompanyResearchRecord, 'name' | 'market' | 'asOf' | 'summary' | 'sources' | 'basis'> & {
    kind: 'etf'; allocations: AllocationGroup[]; theme?: string; themeResearch?: CompanyResearchRecord;
};
export type ResearchRecord = CompanyResearchRecord | EtfResearchRecord;

export const RESEARCH_DIMENSIONS = [
    { key: 'cycle', label: { en: 'Cycle', zh: '循環' } },
    { key: 'technology', label: { en: 'Technology', zh: '技術力' } },
    { key: 'delivery', label: { en: 'Delivery', zh: '交貨' } },
] as const;

const VIEWS = ['順風', '中性', '逆風'];
const LEANS = ['買', '中立', '賣'];
const text = (value: unknown) => typeof value === 'string' && value.trim() ? value.trim() : null;
const flowchart = (value: unknown) => { const source = text(value); return source && /^(flowchart|graph)\s/.test(source) ? source : null; };
const https = (value: unknown) => { try { return typeof value === 'string' && new URL(value).protocol === 'https:'; } catch { return false; } };
const isoDate = (value: unknown) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;

function parseAllocations(raw: unknown): AllocationGroup[] | null {
    if (!Array.isArray(raw) || !raw.length) return null;
    const dimensions = new Set<string>();
    const groups: AllocationGroup[] = [];
    for (const group of raw) {
        if (!group || !['holdings', 'sectors', 'regions', 'assets', 'derivatives'].includes(group.dimension)
            || dimensions.has(group.dimension) || !['complete', 'partial', 'unavailable'].includes(group.coverage)
            || !text(group.denominator) || !text(group.sourceLabel) || !https(group.sourceUrl) || !Array.isArray(group.items)) return null;
        dimensions.add(group.dimension);
        const unavailable = group.coverage === 'unavailable';
        if (unavailable ? group.items.length !== 0 || (group.asOf !== null && !isoDate(group.asOf))
            : !group.items.length || !isoDate(group.asOf)) return null;
        const names = new Set<string>();
        const items: AllocationGroup['items'] = [];
        for (const item of group.items) {
            const name = text(item?.name);
            if (!name || names.has(name) || typeof item.weightPercent !== 'number' || !Number.isFinite(item.weightPercent)) return null;
            names.add(name);
            items.push({ name, weightPercent: item.weightPercent });
        }
        // Keep the disclosed ratio. Derivative exposure may exceed 100% or be negative.
        groups.push({ dimension: group.dimension, asOf: group.asOf, coverage: group.coverage,
            denominator: group.denominator.trim(), sourceLabel: group.sourceLabel.trim(), sourceUrl: group.sourceUrl, items });
    }
    return groups;
}

export function parseResearchRecord(content: string): ResearchRecord | null {
    let data: any;
    try { data = JSON.parse(content); } catch { return null; }
    if (!data || typeof data !== 'object') return null;
    if (data.kind === 'etf') {
        const allocations = parseAllocations(data.allocations);
        if (!text(data.name) || !text(data.summary) || !isoDate(data.asOf) || !allocations) return null;
        const theme = text(data.theme);
        let themeResearch: CompanyResearchRecord | undefined;
        if (theme || data.themeResearch !== undefined) {
            if (!theme || !data.themeResearch || typeof data.themeResearch !== 'object') return null;
            const parsed = parseResearchRecord(JSON.stringify({ ...data.themeResearch, kind: 'company',
                name: data.name, market: data.market, asOf: data.asOf }));
            if (!parsed || parsed.kind === 'etf') return null;
            themeResearch = parsed;
        }
        return { kind: 'etf', name: data.name.trim(), market: text(data.market) || 'TW', asOf: data.asOf,
            summary: data.summary.trim(), allocations, ...(theme ? { theme, themeResearch } : {}),
            sources: Array.isArray(data.sources) ? data.sources.filter((s: any) => text(s?.label) && https(s?.url)) : [],
            basis: text(data.basis) || undefined };
    }
    if (data.kind !== undefined && data.kind !== 'company') return null;
    const supplyChain = flowchart(data.supplyChain), technology = flowchart(data.technology);
    if (!text(data.name) || !text(data.summary) || !supplyChain || !technology || !LEANS.includes(data.lean)) return null;
    const assessment = {} as CompanyResearchRecord['assessment'];
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

// Industry groups (族群) from maya-sawa's stock / group / membership tables. A group may name an industry diagram
// (e.g. the datacenter DC power rack), which the Research tab shows only for that group's members.
export type IndustryMember = { recordCode: string; code?: string; market: string; name: string; role: string };
export type IndustryGroup = { id: string; name: { zh: string; en: string }; diagram: string | null; members: IndustryMember[] };

export function industryDiagrams(groups: ReadonlyArray<IndustryGroup>): string[] {
    return [...new Set(groups.flatMap((group) => group.diagram ? [group.diagram] : []))];
}

export function industryPeers(groups: ReadonlyArray<IndustryGroup>, recordCode: string) {
    return groups.map((group) => ({ id: group.id, name: group.name, peers: group.members.map((member) => ({
        recordCode: member.recordCode, name: member.name, market: member.market, role: member.role, current: member.recordCode === recordCode })) }));
}
