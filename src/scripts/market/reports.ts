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
  const value = text.toLowerCase();
  const matches: Array<[string, RegExp]> = [
    ['foundry', /foundry|wafer|晶圓代工|晶圓廠/], ['memory', /memory|dram|nand|記憶體/],
    ['packaging', /packaging|封裝|測試/], ['abf', /\babf\b/], ['ccl_pcb', /ccl|pcb|銅箔基板|印刷電路板/],
    ['thermal', /thermal|cooling|散熱|液冷/], ['optical', /optical|photonics|光通訊|光模組/],
    ['odm', /\bodm\b|組裝/], ['csp', /\bcsp\b|cloud service|hyperscaler|雲端業者/],
  ];
  return matches.find(([, pattern]) => pattern.test(value))?.[0] ?? null;
}

const REPORT_INDUSTRY_SEGMENTS: Array<[string, Set<string>]> = [
  ['半導體', new Set(['foundry', 'memory', 'packaging', 'abf'])],
  ['PCB 與電子材料', new Set(['ccl_pcb'])],
  ['AI 伺服器與雲端', new Set(['odm', 'csp'])],
  ['散熱', new Set(['thermal'])],
  ['光通訊', new Set(['optical'])],
];

/** Map extracted report claim segments to a broad, readable industry board. */
export function reportIndustryCategory(segments: string[]): string {
  const normalized = new Set(segments.map((segment) => segment.trim().toLowerCase()));
  return REPORT_INDUSTRY_SEGMENTS.find(([, members]) => [...members].some((segment) => normalized.has(segment)))?.[0] ?? '其他產業';
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
