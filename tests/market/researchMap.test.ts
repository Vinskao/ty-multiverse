import { describe, it, expect } from 'vitest';
import { parseResearchRecord, researchRecordCode, RESEARCH_DIMENSIONS, researchViewTone, researchLeanTone, industryDiagrams, industryPeers } from '../../src/scripts/market/researchMap';
import tsmc from '../fixtures/research-2330.json';

// Seeded production record (maya-sawa/maya_sawa/data/market_research/2330.json), stored under productType=research.
describe('parseResearchRecord', () => {
    it('reads the summary, both Mermaid diagrams and the cycle / technology / delivery views', () => {
        const record = parseResearchRecord(JSON.stringify(tsmc))!;
        expect(record.name).toBe('台積電');
        expect(record.lean).toBe('買');
        expect(record.supplyChain.startsWith('flowchart LR')).toBe(true);
        expect(record.technology.startsWith('flowchart LR')).toBe(true);
        expect(RESEARCH_DIMENSIONS.map((dimension) => record.assessment[dimension.key].view)).toEqual(['順風', '順風', '順風']);
    });

    it('keeps only https source links', () => {
        const record = parseResearchRecord(JSON.stringify({ ...tsmc, sources: [{ label: 'ok', url: 'https://example.com' }, { label: 'bad', url: 'javascript:alert(1)' }] }))!;
        expect(record.sources.map((source) => source.label)).toEqual(['ok']);
    });

    it('returns null for free text or a record without both diagrams', () => {
        expect(parseResearchRecord('plain commentary')).toBeNull();
        expect(parseResearchRecord(JSON.stringify({ ...tsmc, technology: '' }))).toBeNull();
        expect(parseResearchRecord(JSON.stringify({ ...tsmc, lean: 'Strong buy' }))).toBeNull();
    });
});

describe('researchRecordCode', () => {
    it('uses the analysis record identity: bare Taiwan code, CODE-MARKET overseas, underlying stock for stock futures', () => {
        expect(researchRecordCode({ code: '2330', market: 'TW', productType: 'stock' })).toBe('2330');
        expect(researchRecordCode({ code: '6857', market: 'JP', productType: 'stock' })).toBe('6857-JP');
        expect(researchRecordCode({ code: 'QFFJ6', market: 'TW', productType: 'futures', underlyingCode: '2330' })).toBe('2330');
        expect(researchRecordCode({ code: 'TXF', productType: 'futures' })).toBe('TXF');
    });
});

describe('tones', () => {
    it('maps views and leans to badge tones', () => {
        expect(['順風', '中性', '逆風'].map(researchViewTone)).toEqual(['up', 'flat', 'down']);
        expect(['買', '中立', '賣'].map(researchLeanTone)).toEqual(['up', 'flat', 'down']);
    });
});

// Industry groups (族群) come from maya-sawa's group / stock / membership tables (GET /market/dashboard/industries?code=).
const groups = [
    { id: 'ai-optics', name: { zh: 'AI 光通訊', en: 'AI optical interconnect' }, diagram: null, members: [
        { recordCode: '3081', code: '3081', market: 'TW', name: '聯亞', role: 'InP 磊晶片' },
        { recordCode: 'LITE-US', code: 'LITE', market: 'US', name: 'Lumentum', role: 'EML / CW 雷射與光模組' }] },
    { id: 'dc-power-rack', name: { zh: '機房直流電源', en: 'Datacenter DC power' }, diagram: 'power-rack', members: [
        { recordCode: '2301', code: '2301', market: 'TW', name: '光寶科', role: '電源架整流器與 BBU' }] },
];

describe('industry groups', () => {
    it("shows an industry diagram only when one of the stock's groups names it", () => {
        expect(industryDiagrams(groups)).toEqual(['power-rack']);
        expect(industryDiagrams(groups.slice(0, 1))).toEqual([]);
        expect(industryDiagrams([])).toEqual([]);
    });

    it('lists peers per group with the selected stock marked', () => {
        expect(industryPeers(groups.slice(0, 1), '3081')).toEqual([{ id: 'ai-optics', name: { zh: 'AI 光通訊', en: 'AI optical interconnect' }, peers: [
            { recordCode: '3081', name: '聯亞', market: 'TW', role: 'InP 磊晶片', current: true },
            { recordCode: 'LITE-US', name: 'Lumentum', market: 'US', role: 'EML / CW 雷射與光模組', current: false }] }]);
    });
});
