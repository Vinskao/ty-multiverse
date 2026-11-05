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
