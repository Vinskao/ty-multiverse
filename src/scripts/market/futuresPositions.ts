// TAIEX futures participant positions (TAIFEX futContractsDate, collected as taifex:futures-institutional).
// Net open interest is the standing position ("外資淨空單"); net trading is only that day's change in activity.
// Covered by tests/market/futuresPositions.test.ts.

export const OPEN_INTEREST_SOURCE = 'taifex:futures-institutional';
export const OPEN_INTEREST_FIELDS = ['foreign_net_open_interest', 'trust_net_open_interest', 'dealer_net_open_interest'];

type Point = { date: string; sources?: Record<string, Record<string, unknown> | undefined> };

function foreignNet(point: Point): number | null {
  const value = point.sources?.[OPEN_INTEREST_SOURCE]?.foreign_net_open_interest;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

const count = (value: number) => Math.abs(value).toLocaleString('en-US');

/** "外資台指期淨空單 91,145 口（10/19），較前一交易日減少 2,530 口", or null without data. */
export function foreignPositionSummary(points: Point[], lang: 'zh' | 'en'): string | null {
  const known = points.filter((point) => foreignNet(point) !== null);
  const latest = known.at(-1);
  if (!latest) return null;
  const now = foreignNet(latest)!;
  const day = latest.date.slice(5).replace('-', '/');
  const side = (value: number) => value < 0 ? (lang === 'en' ? 'net short' : '淨空單') : (lang === 'en' ? 'net long' : '淨多單');
  const head = lang === 'en'
    ? `Foreign TAIEX futures ${side(now)} ${count(now)} contracts (${day})`
    : `外資台指期${side(now)} ${count(now)} 口（${day}）`;
  const previous = known.at(-2);
  if (!previous) return head;
  const before = foreignNet(previous)!;
  if (Math.sign(before) !== Math.sign(now) && before !== 0 && now !== 0) {
    return lang === 'en' ? `${head}, previous trading day ${side(before)} ${count(before)}` : `${head}，前一交易日為${side(before)} ${count(before)} 口`;
  }
  const change = Math.abs(now) - Math.abs(before);
  if (change === 0) return lang === 'en' ? `${head}, unchanged from the previous trading day` : `${head}，與前一交易日持平`;
  return lang === 'en'
    ? `${head}, ${change > 0 ? 'up' : 'down'} ${count(change)} from the previous trading day`
    : `${head}，較前一交易日${change > 0 ? '增加' : '減少'} ${count(change)} 口`;
}
