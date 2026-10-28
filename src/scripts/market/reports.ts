import { researchSegmentForText, researchTagIdForSegments, researchTagIdsForSegments, researchTagIdsForText, researchTagLabel, segmentsForResearchTags, type ResearchTagId } from './researchTaxonomy';

export type ReportStatus = 'extracted' | 'embedded' | 'claims_pending' | 'backlog' | 'ready' | 'failed';
export const MAX_REPORT_BYTES = 40 * 1024 * 1024;
export type MarketReport = {
  id: string;
  title: string;
  publisher: string;
  published_at: string | null;
  received_at?: string;
  source_url?: string | null;
  page_count: number;
  visibility: 'public' | 'owner';
  status: ReportStatus;
  failure_reason?: string | null;
  claim_count: number;
  can_download?: boolean;
  claims: Array<{ page: number; segment: string; direction: 'tailwind' | 'neutral' | 'headwind'; claim: string }>;
};

export function canUploadReports(authenticated: boolean, owner: boolean): boolean {
  return authenticated && owner;
}

export function reportFileAllowed(size: number, type: string, filename: string): boolean {
  return size > 0 && size <= MAX_REPORT_BYTES && type === 'application/pdf' && filename.toLowerCase().endsWith('.pdf');
}

export function reportStatusLabel(status: ReportStatus, claimCount?: number, failureReason?: string | null): string {
  if (status === 'extracted') return '已抽取文字，正在向量化';
  if (status === 'embedded') return '已向量化，等待萃取主張';
  if (status === 'claims_pending') return '等待萃取主張';
  if (status === 'backlog') return '排隊中：舊貼文，每天分批萃取主張';
  if (status === 'ready') return `完成（${claimCount ?? 0} 項主張）`;
  return `處理失敗：${failureReason || '請稍後重試'}`;
}

export function reportClaimTone(direction: 'tailwind' | 'neutral' | 'headwind', lean: string | null | undefined): 'opposed' | 'aligned' | 'neutral' {
  if (direction === 'neutral' || !lean) return 'neutral';
  const bearish = /bear|sell|short|偏空|看跌|賣|空/.test(lean.toLowerCase());
  const bullish = /bull|buy|long|偏多|看漲|買|多/.test(lean.toLowerCase());
  if (!bearish && !bullish) return 'neutral';
  return (direction === 'tailwind') === bullish ? 'aligned' : 'opposed';
}

export function reportSegmentForText(text: string): string | null {
  return researchSegmentForText(text);
}

export function reportTagIdForReport(report: Pick<MarketReport, 'title' | 'claims'>): ResearchTagId {
  const text = `${report.title} ${(report.claims ?? []).map(({ claim, segment }) => `${segment} ${claim}`).join(' ')}`;
  if (researchTagIdsForText(text).includes('cpo')) return 'cpo';
  const claimTags = researchTagIdsForSegments((report.claims ?? []).map(({ segment }) => segment));
  return claimTags[0] ?? researchTagIdsForText(text)[0] ?? 'other';
}

/** Map extracted report claim segments to the labels shared with stock research groups. */
export function reportIndustryCategory(segments: string[]): string {
  return researchTagLabel(researchTagIdForSegments(segments), 'zh');
}

export function reportIndustryForReport(report: Pick<MarketReport, 'title' | 'claims'>): string {
  return researchTagLabel(reportTagIdForReport(report), 'zh');
}

export function reportClaimRelevantToResearchTags(claim: { codes: string[]; segment: string }, code: string, tagIds: string[]): boolean {
  return claim.codes.includes(code.toUpperCase())
    || (claim.codes.length === 0 && segmentsForResearchTags(tagIds).includes(claim.segment));
}
/** Failed, textless imports do not help readers evaluate a report. */
export function reportHasAnalyzableText(report: Pick<MarketReport, 'status' | 'failure_reason' | 'claims' | 'source_url' | 'claim_count'>): boolean {
  if (report.status === 'ready' && reportIsChannelPost(report) && report.claim_count === 0 && !(report.claims?.length)) return false;
  const noText = /no\s+(?:readable\s+)?text|no\s+transcript|without\s+transcript|文字層|沒有文字|無文字|無逐字稿|無字幕|無法擷取文字/i
    .test(report.failure_reason ?? '');
  return !(report.status === 'failed' && noText && !(report.claims?.length));
}

/** Search the visible text of a report; every typed word must match somewhere. */
export function reportSearchMatches(report: Pick<MarketReport, 'title' | 'publisher' | 'source_url' | 'claims'>, query: string): boolean {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return true;
  const content = [report.title, report.publisher, report.source_url ?? '', ...(report.claims ?? []).flatMap(({ claim, segment }) => [claim, segment])]
    .join(' ').toLocaleLowerCase();
  return terms.every((term) => content.includes(term));
}

export function filterMarketReports(reports: MarketReport[], categoryId: string, query: string): MarketReport[] {
  return reports.filter((report) => reportHasAnalyzableText(report)
    && (categoryId === 'all' || reportTagIdForReport(report) === categoryId)
    && reportSearchMatches(report, query));
}

export function reportClaimRelevant(claim: { codes: string[]; segment: string }, code: string, segment: string | null): boolean {
  return claim.codes.includes(code.toUpperCase()) || (claim.codes.length === 0 && segment !== null && claim.segment === segment);
}

const recordedDay = (receivedAt?: string | null) => (receivedAt ? receivedAt.slice(0, 10) : '');

/** Report card date: the publication date when known, always the day it was recorded in the database. */
export function reportDateLabel(report: { published_at: string | null; received_at?: string | null }): string {
  const recorded = recordedDay(report.received_at);
  return `${report.published_at ? `發布 ${report.published_at}` : '發布日未填'}${recorded ? ` · 入庫 ${recorded}` : ''}`;
}

/** Date in a claim citation: the report's publication date, else the day the report was recorded. */
export function claimDateLabel(claim: { published_at: string | null; received_at?: string | null }): string {
  if (claim.published_at) return claim.published_at;
  const recorded = recordedDay(claim.received_at);
  return recorded ? `入庫 ${recorded}` : '';
}

/** Posts collected from public Telegram channels have a link to the post instead of a PDF. */
export function reportIsChannelPost(report: { source_url?: string | null }): boolean {
  return /^https:\/\/t\.me\//.test(report.source_url ?? '');
}

/** A news article the collector read from a link in a channel digest (full text stored; the page shows claims and a link). */
export function reportIsWebArticle(report: { source_url?: string | null }): boolean {
  return /^https?:\/\//.test(report.source_url ?? '') && !reportIsChannelPost(report);
}

export function reportMetaLine(report: MarketReport): string {
  const head = `${report.publisher || '出版者未填'} · ${reportDateLabel(report)}`;
  if (reportIsWebArticle(report)) {
    return `${head} · 網路文章 · ${report.claim_count} 項主張${report.status === 'ready' ? '' : ` · ${reportStatusLabel(report.status, report.claim_count, report.failure_reason)}`}`;
  }
  return reportIsChannelPost(report)
    ? `${head} · 頻道貼文 · ${report.claim_count} 項主張${report.status === 'ready' ? '' : ` · ${reportStatusLabel(report.status, report.claim_count, report.failure_reason)}`}`
    : `${head} · ${report.page_count} 頁 · ${report.claim_count} 項主張 · ${reportStatusLabel(report.status, report.claim_count, report.failure_reason)}`;
}

/** Mirrors the server: only https://www.sec.gov/Archives/edgar/data/... pages (.htm) can be added from a URL. */
export function secFilingUrlAllowed(url: string): boolean {
  try {
    const parts = new URL(url.trim());
    return parts.protocol === 'https:' && parts.hostname === 'www.sec.gov' && parts.pathname.startsWith('/Archives/edgar/data/') && /\.html?$/i.test(parts.pathname);
  } catch { return false; }
}

export type WebImportResult = { title: string; created: number; known: number; sections: string[]; characters: number };

export function webImportSummary(result: WebImportResult, zh: boolean): string {
  if (!result.created) return zh ? `${result.title} 已經加入過（${result.known} 份），沒有新增。` : `${result.title} was already added (${result.known} reports); nothing new.`;
  const size = result.characters >= 10000 ? `${(result.characters / 10000).toFixed(1)} 萬` : String(result.characters);
  return zh ? `已加入 ${result.title}：新增 ${result.created} 份報告（${result.sections.length} 個章節、約 ${size}字元）；主張會由萃取排程分批處理。`
    : `Added ${result.title}: ${result.created} reports (${result.sections.length} sections); claims are extracted in batches by the routine.`;
}
