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

// 2026-10-27: a report without a publication date still shows when it was saved to the database.
import { claimDateLabel, reportDateLabel } from '../../src/scripts/market/reports';

describe('report dates', () => {
  it('shows the publication date and the day it was recorded, or only the recording day when no publication date is known', () => {
    expect(reportDateLabel({ published_at: '2026-10-01', received_at: '2026-10-27T01:03:00.000+00:00' })).toBe('發布 2026-10-01 · 入庫 2026-10-27');
    expect(reportDateLabel({ published_at: null, received_at: '2026-10-20T05:35:13.559+00:00' })).toBe('發布日未填 · 入庫 2026-10-20');
    expect(reportDateLabel({ published_at: null })).toBe('發布日未填');
  });

  it('dates a claim by the report, falling back to the recording day', () => {
    expect(claimDateLabel({ published_at: '2026-10-01', received_at: '2026-10-27T01:03:00+00:00' })).toBe('2026-10-01');
    expect(claimDateLabel({ published_at: null, received_at: '2026-10-20T05:35:13+00:00' })).toBe('入庫 2026-10-20');
    expect(claimDateLabel({ published_at: null })).toBe('');
  });
});

import { reportIsChannelPost, reportMetaLine } from '../../src/scripts/market/reports';

describe('channel posts in the report list', () => {
  const base = { id: 'a', title: '[股癌] EP1', publisher: '股癌 Gooaye', published_at: '2026-10-25', received_at: '2026-10-26T01:00:00+00:00',
    page_count: 1, visibility: 'public', status: 'ready', claim_count: 3, claims: [] } as MarketReport;
  it('recognises a Telegram post by its source link, not by the missing PDF', () => {
    expect(reportIsChannelPost({ ...base, source_url: 'https://t.me/Gooaye/123' })).toBe(true);
    expect(reportIsChannelPost({ ...base, source_url: 'https://example.com/report.pdf' })).toBe(false);
    expect(reportIsChannelPost({ ...base, source_url: null })).toBe(false);
  });
  it('does not call a one-message post "1 頁" and keeps the claim count', () => {
    expect(reportMetaLine({ ...base, source_url: 'https://t.me/Gooaye/123' })).toBe('股癌 Gooaye · 發布 2026-10-25 · 入庫 2026-10-26 · 頻道貼文 · 3 項主張');
    expect(reportMetaLine(base)).toBe('股癌 Gooaye · 發布 2026-10-25 · 入庫 2026-10-26 · 1 頁 · 3 項主張 · 完成（3 項主張）');
  });
});
