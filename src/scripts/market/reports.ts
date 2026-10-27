export type ReportStatus = 'extracted' | 'embedded' | 'claims_pending' | 'ready' | 'failed';
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
