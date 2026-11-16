// Live volatility readings (Taiwan VIX from TAIFEX, U.S. VIX from Yahoo) joined to the stored daily history.
// Covered by tests/market/macroVolatility.test.ts.

export type LiveVolatility = {
  value: number; previousClose: number | null; high: number | null; low: number | null; open?: number | null;
  change: number | null; changePercent: number | null; asOf: string; date: string;
};

type Point = { period: string; value: string };

/** The stored daily closes plus today's live value as the newest point (replacing a stored point of the same day). */
export function withLivePoint(history: Point[] | undefined, live: LiveVolatility | null): Point[] {
  const base = history ?? [];
  if (!live || !Number.isFinite(live.value)) return base;
  const newest = base.length ? base[base.length - 1].period : '';
  if (newest && live.date < newest) return base;
  return [...base.filter((point) => point.period !== live.date), { period: live.date, value: String(live.value) }];
}

const signed = (value: number, digits: number) => `${value > 0 ? '+' : ''}${value.toFixed(digits)}`;

/** "即時 44.68（+6.84，+18.08%）｜開 40.83 高 45.42 低 40.83｜12:30" — the time is the reading's own exchange clock. */
export function liveReadout(live: LiveVolatility | null, language: 'zh' | 'en'): string {
  if (!live) return '';
  const zh = language === 'zh';
  const move = live.change != null && live.changePercent != null ? `（${signed(live.change, 2)}，${signed(live.changePercent, 2)}%）` : '';
  const range = [live.open != null ? `${zh ? '開' : 'Open'} ${live.open}` : '', live.high != null ? `${zh ? '高' : 'High'} ${live.high}` : '',
    live.low != null ? `${zh ? '低' : 'Low'} ${live.low}` : ''].filter(Boolean).join(' ');
  const time = /T(\d{2}:\d{2})/.exec(live.asOf)?.[1] ?? '';
  return [`${zh ? '即時' : 'Live'} ${live.value}${move}`, range, time && (zh ? `${live.date.slice(5)} ${time}` : `${live.date.slice(5)} ${time}`)].filter(Boolean).join('｜');
}

/** VIXY, the VIX futures ETF: trades pre and after hours, so it stands in for the futures overnight (it is not the futures). */
export type LiveFuturesProxy = {
  value: number; session: 'pre' | 'regular' | 'post'; regularClose: number | null; previousClose: number | null;
  changeFromClose: number | null; changeFromClosePercent: number | null; changePercent: number | null; asOf: string; date: string;
};

export function futuresProxyReadout(live: LiveFuturesProxy | null, language: 'zh' | 'en'): string {
  if (!live) return '';
  const zh = language === 'zh';
  const session = { pre: zh ? '盤前' : 'pre-market', regular: zh ? '盤中' : 'regular session', post: zh ? '盤後' : 'after hours' }[live.session];
  const pct = (value: number | null) => (value == null ? '' : `${value > 0 ? '+' : ''}${value.toFixed(2)}%`);
  const moves = [live.changeFromClosePercent != null ? `${zh ? '較收盤' : 'vs close'} ${pct(live.changeFromClosePercent)}` : '',
    live.changePercent != null ? `${zh ? '較昨收' : 'vs prior close'} ${pct(live.changePercent)}` : ''].filter(Boolean).join(zh ? '，' : ', ');
  const time = /T(\d{2}:\d{2})/.exec(live.asOf)?.[1];
  const head = zh ? `VIX 期貨替代指標（VIXY ETF，非期貨本身）${live.value}` : `VIX futures stand-in (VIXY ETF, not the futures) ${live.value}`;
  return [head, session, moves, time && `${live.date.slice(5)} ${time} ${zh ? '美東' : 'ET'}`].filter(Boolean).join('｜');
}
