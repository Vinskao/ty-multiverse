import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { canUploadReports, filterMarketReports, reportFileAllowed, MAX_REPORT_BYTES, reportStatusLabel, reportClaimTone, reportSegmentForText, reportClaimRelevant, reportClaimRelevantToResearchTags, reportIndustryCategory, reportIndustryForReport, reportHasAnalyzableText, reportSearchMatches, type MarketReport } from '../../src/scripts/market/reports';

describe('report industry categories', () => {
  it('groups company and supply-chain segments into readable industry boards', () => {
    expect(reportIndustryCategory(['foundry', 'memory'])).toBe('半導體');
    expect(reportIndustryCategory(['ccl_pcb'])).toBe('PCB 與電子材料');
    expect(reportIndustryCategory(['odm', 'csp'])).toBe('AI 伺服器與雲端');
    expect(reportIndustryCategory(['thermal'])).toBe('散熱');
    expect(reportIndustryCategory(['optical'])).toBe('光通訊');
  });

  it('gives CPO and interposer optics their own board, ahead of general optical communications', () => {
    expect(reportSegmentForText('NVIDIA 中介層光學 CPO co-packaged optics')).toBe('cpo');
    expect(reportIndustryForReport({ title: '輝達 CPO 布局再升級：中介層光學', claims: [{ segment: 'optical', claim: 'CPO co-packaged optics' }] })).toContain('CPO');
    expect(reportIndustryForReport({ title: '800G 光通訊模組', claims: [{ segment: 'optical', claim: 'optical transceiver' }] })).toBe(reportIndustryCategory(['optical']));
  });

  it('hides reports that failed because no readable text or transcript was available', () => {
    const noTranscript = { status: 'failed', failure_reason: '沒有文字或逐字稿可供分析', claims: [] } as MarketReport;
    const readable = { ...noTranscript, failure_reason: 'temporary extraction timeout' } as MarketReport;
    expect(reportHasAnalyzableText(noTranscript)).toBe(false);
    expect(reportHasAnalyzableText(readable)).toBe(true);
  });

  it('hides completed Telegram episodes that have no extracted text claims', () => {
    const episode = { status: 'ready', source_url: 'https://t.me/Gooaye/6499', claim_count: 0, claims: [] } as MarketReport;
    const analyzed = { ...episode, claim_count: 1, claims: [{ page: 1, segment: 'optical', direction: 'neutral', claim: 'CPO technology update' }] } as MarketReport;
    expect(reportHasAnalyzableText(episode)).toBe(false);
    expect(reportHasAnalyzableText(analyzed)).toBe(true);
  });

  it('searches titles, publishers, and extracted claim text without case sensitivity', () => {
    const report = { title: 'NVIDIA CPO optics', publisher: 'Gooaye', claims: [{ claim: 'co-packaged optics volume ramp' }] } as MarketReport;
    expect(reportSearchMatches(report, 'gooaye cpo')).toBe(true);
    expect(reportSearchMatches(report, 'volume ramp')).toBe(true);
    expect(reportSearchMatches(report, 'foundry')).toBe(false);
  });

  it('combines category and text search while excluding textless reports', () => {
    const cpo = { id: 'cpo', title: 'NVIDIA CPO interposer optics', publisher: 'Gooaye', status: 'ready', claims: [{ segment: 'optical', claim: 'co-packaged optics ramp' }] } as MarketReport;
    const optical = { id: 'optical', title: '800G optics', publisher: 'Analyst', status: 'ready', claims: [{ segment: 'optical', claim: 'transceiver demand' }] } as MarketReport;
    const empty = { id: 'empty', title: 'Podcast EP707', publisher: 'Gooaye', status: 'failed', failure_reason: 'no transcript or readable text', claims: [] } as MarketReport;
    expect(filterMarketReports([cpo, optical, empty], 'cpo', 'Gooaye')).toEqual([cpo]);
  });

  it('shares CPO tags with existing optical claims when building stock research context', () => {
    expect(reportClaimRelevantToResearchTags({ codes: [], segment: 'optical' }, 'NVDA', ['cpo'])).toBe(true);
    expect(reportClaimRelevantToResearchTags({ codes: ['2330'], segment: 'optical' }, 'NVDA', ['cpo'])).toBe(false);
  });

  it('keeps unclassified reports in a catch-all category', () => {
    expect(reportIndustryCategory([])).toBe('其他產業');
    expect(reportIndustryCategory(['macroeconomics'])).toBe('其他產業');
  });
});

it('provides a sector filter area above the market report list', () => {
  const home = readFileSync(resolve(process.cwd(), 'src/pages/index.astro'), 'utf8');
  expect(home).toMatch(/id="market-report-filters"[^>]*aria-label="依產業板塊篩選"/);
  expect(home.indexOf('id="market-report-filters"')).toBeLessThan(home.indexOf('id="market-report-list"'));
});

it('places category navigation on the left and searchable reports on the right', () => {
  const home = readFileSync(resolve(process.cwd(), 'src/pages/index.astro'), 'utf8');
  expect(home).toContain('class="market-report-browser"');
  expect(home).toMatch(/id="market-report-search"[^>]*type="search"/);
  expect(home.indexOf('market-report-sidebar')).toBeLessThan(home.indexOf('id="market-report-list"'));
});

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

  it('does not call a queued old channel post a failure', () => {
    // 2026-10-28: posts waiting in the backlog showed "處理失敗：請稍後重試" because any unknown status fell through to the failure text.
    const label = reportStatusLabel('backlog');
    expect(label).toContain('排隊');
    expect(label).not.toContain('失敗');
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
  it('says when a post is still waiting for its claims', () => {
    expect(reportMetaLine({ ...base, claim_count: 0, status: 'claims_pending', source_url: 'https://t.me/ieobserve/1' })).toBe('股癌 Gooaye · 發布 2026-10-25 · 入庫 2026-10-26 · 頻道貼文 · 0 項主張 · 等待萃取主張');
  });
  it('does not call a one-message post "1 頁" and keeps the claim count', () => {
    expect(reportMetaLine({ ...base, source_url: 'https://t.me/Gooaye/123' })).toBe('股癌 Gooaye · 發布 2026-10-25 · 入庫 2026-10-26 · 頻道貼文 · 3 項主張');
    expect(reportMetaLine(base)).toBe('股癌 Gooaye · 發布 2026-10-25 · 入庫 2026-10-26 · 1 頁 · 3 項主張 · 完成（3 項主張）');
  });
});

import { reportIsWebArticle } from '../../src/scripts/market/reports';

describe('news articles collected from channel links', () => {
  const article = { id: 'n', title: '花旗給聯發科 6,800 元目標價', publisher: 'TechNews 科技新報', published_at: '2026-10-22', received_at: '2026-10-28T01:00:00+00:00',
    source_url: 'https://finance.technews.tw/2026/10/22/a/', page_count: 1, visibility: 'public', status: 'ready', claim_count: 4, claims: [] } as MarketReport;
  it('tells a web article from a channel post and from an uploaded PDF', () => {
    expect(reportIsWebArticle(article)).toBe(true);
    expect(reportIsWebArticle({ ...article, source_url: 'https://t.me/technews_tw/1' })).toBe(false);
    expect(reportIsWebArticle({ ...article, source_url: null })).toBe(false);
  });
  it('labels it an article, not "1 頁", and still shows a queued state', () => {
    expect(reportMetaLine(article)).toBe('TechNews 科技新報 · 發布 2026-10-22 · 入庫 2026-10-28 · 網路文章 · 4 項主張');
    expect(reportMetaLine({ ...article, claim_count: 0, status: 'claims_pending' })).toContain('等待萃取主張');
  });
});

import { secFilingUrlAllowed, webImportSummary } from '../../src/scripts/market/reports';

describe('adding an SEC filing from its URL', () => {
  const url = 'https://www.sec.gov/Archives/edgar/data/2130357/000162828026067168/anthropicpbc-sx1.htm';
  it('accepts only EDGAR archive pages on sec.gov, like the server', () => {
    expect(secFilingUrlAllowed(url)).toBe(true);
    expect(secFilingUrlAllowed(` ${url} `)).toBe(true);
    for (const bad of ['http://www.sec.gov/Archives/edgar/data/1/2/a.htm', 'https://evil.example/Archives/edgar/data/1/2/a.htm',
      'https://www.sec.gov/cgi-bin/browse-edgar', 'https://www.sec.gov/Archives/edgar/data/1/2/a.pdf', '', 'not a url']) {
      expect(secFilingUrlAllowed(bad), bad).toBe(false);
    }
  });
  it('says what was added, what was already there, and that extraction runs in batches', () => {
    const made = { title: 'Anthropic, PBC S-1', created: 16, known: 0, sections: ['A', 'B', 'C', 'D', 'E'], characters: 528687 };
    expect(webImportSummary(made, true)).toBe('已加入 Anthropic, PBC S-1：新增 16 份報告（5 個章節、約 52.9 萬字元）；主張會由萃取排程分批處理。');
    expect(webImportSummary({ ...made, created: 0, known: 16 }, true)).toBe('Anthropic, PBC S-1 已經加入過（16 份），沒有新增。');
    expect(webImportSummary({ ...made, created: 2, known: 14 }, true)).toContain('新增 2 份');
  });
});
