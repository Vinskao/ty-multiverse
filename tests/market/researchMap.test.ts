import { describe, it, expect } from 'vitest';
import { parseResearchRecord, researchRecordCode, RESEARCH_DIMENSIONS, researchViewTone, researchLeanTone } from '../../src/scripts/market/researchMap';
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
