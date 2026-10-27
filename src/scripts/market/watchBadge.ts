export type WatchFields = { source?: string; reason?: string; reports?: number; expiresAt?: string };

/** The tag on a custom-area row the analyst added from research reports: why it is there and when it would leave. */
export function watchBadge(item: WatchFields, zh: boolean): { text: string; title: string } | null {
  if (item.source !== 'ai-watch') return null;
  const until = item.expiresAt ? `${item.expiresAt.slice(5, 7)}/${item.expiresAt.slice(8, 10)}` : '';
  const text = zh ? `AI 觀察${until ? ` · 到期 ${until}` : ''}` : `AI watch${until ? ` · until ${until}` : ''}`;
  const reports = item.reports ?? 0;
  const support = zh ? `${reports} 份報告支持${until ? `；${until} 前沒有新報告提到就會移出` : ''}` : `${reports} report${reports === 1 ? '' : 's'}${until ? `; leaves after ${until} unless a new report mentions it` : ''}`;
  return { text, title: `${item.reason ?? ''}${zh ? `（${support}）` : ` (${support})`}` };
}
