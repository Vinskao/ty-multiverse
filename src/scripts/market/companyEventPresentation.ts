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

type InsiderEvent = CompanyEvent & { status?: string; period?: string };

/** The row/header mark for an open insider sale filing (maya-sawa market_insider_transfers.py); null when there is none. */
export function insiderSaleNotice(events: readonly InsiderEvent[], zh: boolean): { text: string; title: string } | null {
  const event = events.find((item) => item.type === 'insider_transfer');
  if (!event) return null;
  const active = event.status !== 'upcoming';
  const text = zh ? (active ? '內部人申報賣股中' : '內部人即將賣股') : (active ? 'Insider sale filed' : 'Insider sale starting soon');
  return { text, title: event.period || '' };
}
