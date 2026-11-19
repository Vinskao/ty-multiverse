// The market-status bar (2026-11-17). maya-sawa's /api/market/dashboard/status describes only TODAY: the Taiwan market
// (live index, day vs night session, volume against the 20-day average, a falling market P/E) and the U.S. (SOX, VIX).
// The bar has one row per market; this picks the rows and how strongly the whole bar is styled.
export type HeatGroup = 'tw' | 'us' | 'portfolio';
export type HeatItem = { id: string; level: 'alert' | 'warn' | 'info'; dir?: 'up' | 'down'; group?: HeatGroup; zh: string; en: string; href?: string };
export type HeatStatus = { items?: HeatItem[]; asOf?: string | null; final?: boolean; checkedAt?: string };
export type PortfolioPositioning = { cashPercentage?: number | null; leverageRatio?: number | null; regions?: { total?: { cash?: number | null; totalAssets?: number | null; leverage?: number | null } } };
export type HeatPart = { text: string; href: string | null };
export type HeatRow = { group: HeatGroup; label: string; parts: HeatPart[] };
export type Heat = {
  key: string;                       // dismissing hides this exact state; a stronger or different one shows again
  level: HeatItem['level']; dir: 'up' | 'down'; icon: string;
  rows: HeatRow[]; footnote: string;
};

// Only same-site paths are linked, whatever the server sends.
const safeHref = (href?: string) => (href && /^\/(?!\/)/.test(href) ? href : null);
const LABELS: Record<HeatGroup, { zh: string; en: string }> = { tw: { zh: '台股', en: 'TW' }, us: { zh: '美股', en: 'US' }, portfolio: { zh: '部位', en: 'Positioning' } };

export function portfolioPositioningItem(portfolio: PortfolioPositioning | null | undefined): HeatItem | null {
  if (!portfolio) return null;
  const totalCash = portfolio.regions?.total?.cash;
  const totalAssets = portfolio.regions?.total?.totalAssets;
  const cashPercentage = typeof totalCash === 'number' && typeof totalAssets === 'number' && totalAssets > 0
    ? totalCash / totalAssets * 100
    : portfolio.cashPercentage;
  if (typeof cashPercentage !== 'number' || !Number.isFinite(cashPercentage)) return null;
  const leverage = portfolio.regions?.total?.leverage ?? portfolio.leverageRatio;
  if (typeof leverage === 'number' && Number.isFinite(leverage) && leverage >= 1.5) {
    return { id: 'positioning-leveraged', group: 'portfolio', level: 'alert', dir: 'up',
      zh: `發狂進攻｜部位槓桿 ${leverage.toFixed(2)}x`, en: `Aggressive attack | portfolio leverage ${leverage.toFixed(2)}x` };
  }
  if (typeof leverage === 'number' && Number.isFinite(leverage) && leverage >= 1.1) {
    return { id: 'positioning-leveraged', group: 'portfolio', level: 'warn', dir: 'up',
      zh: `槓桿中｜部位槓桿 ${leverage.toFixed(2)}x`, en: `Leveraged | portfolio leverage ${leverage.toFixed(2)}x` };
  }
  if (cashPercentage >= 70) {
    return { id: 'positioning-cash-heavy', group: 'portfolio', level: 'info', dir: 'down',
      zh: `明哲保身｜現金水位 ${cashPercentage.toFixed(0)}%`, en: `Capital preservation | cash ${cashPercentage.toFixed(0)}%` };
  }
  if (cashPercentage <= 10) {
    return { id: 'positioning-invested', group: 'portfolio', level: 'warn', dir: 'up',
      zh: `進攻｜現金水位僅 ${cashPercentage.toFixed(0)}%`, en: `Offensive | cash only ${cashPercentage.toFixed(0)}%` };
  }
  return null;
}

// While a heavy-volume or big-swing event is on, the bar is refreshed every minute; on a quiet day it is not shown and
// the server is only asked every few minutes to see whether something started.
export const HEAT_POLL_ACTIVE_MS = 60_000;
export const HEAT_POLL_QUIET_MS = 5 * 60_000;
export const heatPollInterval = (showing: boolean) => (showing ? HEAT_POLL_ACTIVE_MS : HEAT_POLL_QUIET_MS);

export function pickHeat(status: HeatStatus | null | undefined, lang: 'zh' | 'en', positioning?: HeatItem | null): Heat | null {
  const items = [...(status?.items ?? []), ...(positioning ? [positioning] : [])];
  if (!items.length || (!positioning && !status?.asOf)) return null;
  const severity = { alert: 0, warn: 1, info: 2 };
  const lead = items.reduce((best, item) => severity[item.level] < severity[best.level] ? item : best);
  const dir = lead.dir === 'up' ? 'up' : 'down';
  const live = status?.final === false;
  const rows = (['portfolio', 'tw', 'us'] as const).flatMap((group) => {
    const own = items.filter((item) => (item.group ?? 'tw') === group);
    return own.length ? [{ group, label: LABELS[group][lang], parts: own.map((item) => ({ text: lang === 'zh' ? item.zh : item.en, href: safeHref(item.href) })) }] : [];
  });
  const footnote = !status?.asOf ? (lang === 'zh' ? '個人帳戶資料' : 'Personal account data') : lang === 'zh'
    ? `${status.asOf}${live ? ' 盤中即時' : ' 收盤'} · 證交所／期交所／Yahoo`
    : `${status.asOf} ${live ? 'live' : 'close'} · TWSE / TAIFEX / Yahoo`;
  return {
    key: `market-heat:${status?.asOf ?? 'account'}:${lead.level}:${items.map((item) => item.id).join(',')}`,
    level: lead.level, dir, icon: lead.level === 'info' ? '📊' : dir === 'up' ? '🚀' : '🔥',
    rows, footnote,
  };
}
