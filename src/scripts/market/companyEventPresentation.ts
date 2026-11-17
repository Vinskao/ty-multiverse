type CompanyEvent = {
  code?: string;
  type: string;
  sourceUrl?: string;
};

const TDCC_EVENTS_URL = 'https://irplatform.tdcc.com.tw/ir/event/list?lang=zh';

export function conferenceOtherScheduleCounts(events: readonly CompanyEvent[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const event of events) {
    if (event.type !== 'investor_conference' || !event.code) continue;
    counts.set(event.code, (counts.get(event.code) || 0) + 1);
  }
  for (const [code, count] of counts) {
    if (count < 2) counts.delete(code);
    else counts.set(code, count - 1);
  }
  return counts;
}

export function companyEventSourceUrl(event: CompanyEvent): string | undefined {
  if (event.sourceUrl) return event.sourceUrl;
  return event.type === 'investor_conference' ? TDCC_EVENTS_URL : undefined;
}

type InsiderEvent = CompanyEvent & { status?: string; period?: string; flag?: string };

/** The row/header mark for an open insider sale filing (maya-sawa market_insider_transfers.py); null when there is none. */
export function insiderSaleNotice(events: readonly InsiderEvent[], zh: boolean): { text: string; title: string } | null {
  const event = events.find((item) => item.type === 'insider_transfer');
  if (!event) return null;
  const active = event.status !== 'upcoming';
  const text = zh ? (active ? '內部人申報賣股中' : '內部人即將賣股') : (active ? 'Insider sale filed' : 'Insider sale starting soon');
  return { text, title: event.period || '' };
}

export type StockNotice = { text: string; title: string; tone: 'sell' | 'buy' | 'neutral' | 'volume' };

/** Every mark for a stock: this week's volume spike first, then the insider marks (open sale filing, unsold filing
 *  未轉讓申報, month-over-month buy). */
export function stockNotices(events: readonly InsiderEvent[], zh: boolean): StockNotice[] {
  const notices: StockNotice[] = [];
  const spike = events.find((event) => event.type === 'volume_spike');
  if (spike) {
    const top5 = spike.flag === 'top5';
    const text = zh ? (top5 ? '爆大量 · 年度前 5' : '大量 · 年度前 10') : (top5 ? 'Volume spike · top 5 of the year' : 'Heavy volume · top 10 of the year');
    notices.push({ text, title: spike.period || '', tone: 'volume' });
  }
  const sale = insiderSaleNotice(events, zh);
  if (sale) notices.push({ ...sale, tone: 'sell' });
  const unsold = events.find((event) => event.type === 'insider_untransferred');
  if (unsold) notices.push({ text: zh ? '內部人申報未賣出' : 'Insider sale not completed', title: unsold.period || '', tone: 'neutral' });
  const buy = events.find((event) => event.type === 'insider_buy');
  if (buy) notices.push({ text: zh ? '內部人增持' : 'Insider buying', title: buy.period || '', tone: 'buy' });
  return notices;
}

const STOCK_NOTICE_TYPES = new Set(['volume_spike', 'insider_transfer', 'insider_untransferred', 'insider_buy']);

/** True for event types shown as a stock badge (stockNotices), so the older per-event badge skips them. */
export const hasStockNotice = (type: string) => STOCK_NOTICE_TYPES.has(type);

/** Events are filed per company; Tokyo stocks share digits with Taiwan codes (6857), so only non-Taiwan markets get a prefix. */
export const marketEventKey = (code: string, market?: string) => (market && market !== 'TW' ? `${market}:${code}` : code);
