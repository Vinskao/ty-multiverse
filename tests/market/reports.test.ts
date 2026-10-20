import { describe, expect, it } from 'vitest';
import { canUploadReports, reportFileAllowed, MAX_REPORT_BYTES, reportStatusLabel, reportClaimTone, reportSegmentForText, reportClaimRelevant, type MarketReport } from '../../src/scripts/market/reports';

describe('market research reports', () => {
  it('shows upload controls only to an authenticated owner', () => {
    expect(canUploadReports(false, false)).toBe(false);
    expect(canUploadReports(true, false)).toBe(false);
    expect(canUploadReports(true, true)).toBe(true);
  });

  it('accepts PDFs up to 40 MiB and rejects other types or larger files', () => {
    expect(reportFileAllowed(MAX_REPORT_BYTES, 'application/pdf', 'report.PDF')).toBe(true);
    expect(reportFileAllowed(MAX_REPORT_BYTES + 1, 'application/pdf', 'report.pdf')).toBe(false);
    expect(reportFileAllowed(10, 'text/plain', 'report.txt')).toBe(false);
  });

  it('maps processing states and failures to clear UI text', () => {
    expect(reportStatusLabel('extracted')).toContain('向量化');
    expect(reportStatusLabel('embedded')).toContain('等待萃取');
    expect(reportStatusLabel('claims_pending')).toContain('等待萃取');
    expect(reportStatusLabel('ready', 4)).toContain('4');
    expect(reportStatusLabel('failed', undefined, '沒有文字層')).toContain('沒有文字層');
  });

  it('marks report claims opposite the saved research lean', () => {
    const claim: MarketReport['claims'][number] = { direction: 'headwind', segment: 'memory', page: 4, claim: 'Supply tightens' };
    expect(reportClaimTone(claim.direction, 'bullish')).toBe('opposed');
    expect(reportClaimTone(claim.direction, 'bearish')).toBe('aligned');
    expect(reportClaimTone('neutral', 'bullish')).toBe('neutral');
  });

  it('matches a holding with both its code-specific and industry-wide claims', () => {
    const segment = reportSegmentForText('Standard DRAM memory producer');
    expect(segment).toBe('memory');
    expect(reportClaimRelevant({ codes: [], segment: 'memory' }, '2408', segment)).toBe(true);
    expect(reportClaimRelevant({ codes: ['2330'], segment: 'memory' }, '2408', segment)).toBe(false);
    expect(reportClaimRelevant({ codes: ['2330'], segment: 'foundry' }, '2408', segment)).toBe(false);
  });
});
