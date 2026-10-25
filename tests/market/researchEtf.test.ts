import { describe, expect, it } from 'vitest';
import fixture from '../fixtures/research-etf-009811.json';
import tsmc from '../fixtures/research-reviewed-2330.json';
import { parseResearchRecord } from '../../src/scripts/market/researchMap';
import { renderResearchContent } from '../../src/scripts/market/researchContent';

describe('ETF allocation research', () => {
  it('accepts allocation-only research without invented company analysis', () => {
    const record = parseResearchRecord(JSON.stringify(fixture))!;
    expect(record).not.toBeNull();
    expect(record.kind).toBe('etf');
    expect(record).not.toHaveProperty('lean');
    expect(record).not.toHaveProperty('assessment');
    expect(record).not.toHaveProperty('technology');
  });
  it('renders dated ratios without company cards, diagrams or an invented remainder', () => {
    const target = document.createElement('div');
    const diagrams = renderResearchContent(target, parseResearchRecord(JSON.stringify(fixture))!, 'zh');
    expect(diagrams).toEqual([]);
    expect(target.textContent).toContain('11.52%');
    expect(target.textContent).toContain('2026-10-14');
    expect(target.textContent).toContain('2026-08-31');
    expect(target.textContent).toContain('部分披露');
    expect(target.textContent).toContain('尚未取得');
    expect(target.textContent).not.toMatch(/偏向|技術力|供應鏈|交貨|其他.*%/);
    expect(target.querySelectorAll('table')).toHaveLength(3);
    expect(target.querySelectorAll('th[scope="col"]')).toHaveLength(6);
    expect(target.querySelectorAll('.market-research-dimension')).toHaveLength(0);
  });
  it('preserves the existing company rendering contract', () => {
    const target = document.createElement('div');
    const diagrams = renderResearchContent(target, parseResearchRecord(JSON.stringify(tsmc))!, 'zh');
    expect(diagrams).toHaveLength(2);
    expect(target.querySelectorAll('.market-research-dimension')).toHaveLength(3);
    expect(target.textContent).toContain('台積電');
    expect(target.textContent).toContain('偏向');
  });
  it('retains theme analysis only when an explicit theme and valid analysis are supplied', () => {
    const themed = { ...fixture, theme: '電動車', themeResearch: tsmc };
    const target = document.createElement('div');
    const record = parseResearchRecord(JSON.stringify(themed))!;
    expect(renderResearchContent(target, record, 'zh')).toHaveLength(2);
    expect(target.textContent).toContain('電動車');
    expect(parseResearchRecord(JSON.stringify({ ...fixture, theme: '電動車' }))).toBeNull();
    expect(parseResearchRecord(JSON.stringify({ ...fixture, themeResearch: tsmc }))).toBeNull();
  });
  it.each([null, '', '11.52', true, -Infinity])('rejects an invalid weight %s', (weightPercent) => {
    const bad = structuredClone(fixture);
    bad.allocations[0].items[0].weightPercent = weightPercent as number;
    expect(parseResearchRecord(JSON.stringify(bad))).toBeNull();
  });
  it('preserves zero, leveraged and negative exposures without renormalizing', () => {
    const raw = structuredClone(fixture);
    raw.allocations[0].items[0].weightPercent = 0;
    raw.allocations[2].items[0].weightPercent = 150;
    raw.allocations[2].items.push({ name: 'Hedge', weightPercent: -20 });
    const record: any = parseResearchRecord(JSON.stringify(raw));
    expect(record.allocations[0].items[0].weightPercent).toBe(0);
    expect(record.allocations[2].items.map((x: any) => x.weightPercent)).toEqual([150, -20]);
  });
  it.each(['date', 'source', 'duplicate', 'missing-items'])('rejects malformed allocation provenance: %s', (kind) => {
    const raw = structuredClone(fixture);
    if (kind === 'date') raw.allocations[0].asOf = '2026-02-30';
    if (kind === 'source') raw.allocations[0].sourceUrl = 'javascript:alert(1)';
    if (kind === 'duplicate') raw.allocations[0].items.push(raw.allocations[0].items[0]);
    if (kind === 'missing-items') raw.allocations[0].items = [];
    expect(parseResearchRecord(JSON.stringify(raw))).toBeNull();
  });
});
