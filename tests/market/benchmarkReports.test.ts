import { describe, expect, it } from 'vitest';
import { filterMarketReports, reportIsBenchmarkAnnual, reportMetaLine, reportTagIdForReport, type MarketReport } from '../../src/scripts/market/reports';
import { researchTagLabel } from '../../src/scripts/market/researchTaxonomy';

const annual = (title: string, publisher: string): MarketReport => ({
  id: title, title, publisher, published_at: null, received_at: '2026-11-11T09:00:00Z', source_url: 'https://www.sec.gov/x.pdf',
  page_count: 0, visibility: 'public', status: 'claims_pending', claim_count: 0, claims: [],
});

describe('benchmark annual reports in the report list', () => {
  it('files each company under its benchmark role before any claim exists', () => {
    expect(reportTagIdForReport(annual('Amazon 2025 年股東年報｜產業與技術摘錄', 'Amazon'))).toBe('ai-server-cloud');
    expect(reportTagIdForReport(annual('台光電 2025 年股東會年報｜產業與技術摘錄', '台光電'))).toBe('pcb-electronics');
    expect(reportTagIdForReport(annual('Lumentum 2026 年股東年報｜產業與技術摘錄', 'Lumentum'))).toBe('optical');
    expect(reportTagIdForReport(annual('愛德萬 2025 年股東年報｜產業與技術摘錄', '愛德萬'))).toBe('semiconductor');
    expect(reportTagIdForReport(annual('村田製作所 2025 年股東年報｜產業與技術摘錄', '村田製作所'))).toBe('pcb-electronics');
  });

  it('has its own filter and is not called a web article', () => {
    const report = annual('台達電 2025 年股東會年報｜產業與技術摘錄', '台達電');
    expect(reportIsBenchmarkAnnual(report)).toBe(true);
    expect(filterMarketReports([report, annual('random news', 'X')], 'benchmark', '')).toEqual([report]);
    expect(reportMetaLine(report)).toContain('股東年報');
    expect(reportMetaLine(report)).not.toContain('網路文章');
  });

  it('puts macro-only reports under 總經 instead of other industries', () => {
    const macro = { ...annual('【行情快報】聯準會暫停升息', 'MacroMicro'), claims: [{ page: 1, segment: 'macro', direction: 'neutral' as const, claim: 'x' }] };
    expect(reportTagIdForReport(macro)).toBe('macro');
    expect(researchTagLabel('macro')).toBe('總經與市場');
  });
});
