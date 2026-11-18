// Today's bar for the stock price chart (2026-11-18). The official daily price (TWSE / TPEx) is collected after the close,
// so the chart ended a day behind. When the stock's own quote is stamped today (Taipei), it stands in as today's bar until
// the official row arrives, and the official row always wins.
type Values = Record<string, number>;
export type HistoryPoint = { date: string; code: string; name: string; sources: Record<string, Values> };
export type LiveQuote = { close: number; open: number; high: number; low: number; volumeShares?: number | null; timestamp?: string } | null | undefined;

const taipeiDay = (date: Date) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Taipei' }).format(date);

export function withLiveBar<T extends HistoryPoint>(points: readonly T[], quote: LiveQuote, productType: string, now: Date = new Date()): T[] {
  const list = [...points];
  if (productType !== 'stock' || !quote || !list.length || !quote.timestamp) return list;
  const stamp = new Date(quote.timestamp);
  if (Number.isNaN(stamp.getTime()) || !(quote.close > 0) || !(quote.open > 0)) return list;
  const today = taipeiDay(now);
  const last = list[list.length - 1];
  if (taipeiDay(stamp) !== today || last.date >= today) return list;   // not today's quote, or the official row is already there
  const live = { open: quote.open, high: quote.high, low: quote.low, close: quote.close, volume_shares: quote.volumeShares && quote.volumeShares > 0 ? quote.volumeShares : 0 };
  return [...list, { ...last, date: today, sources: { 'twse:daily-price': live } } as T];
}
