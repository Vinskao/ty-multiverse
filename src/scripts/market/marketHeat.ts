// The market-status bar (2026-11-17). maya-sawa's /api/market/dashboard/status describes only TODAY: the Taiwan market
// (live index, day vs night session, volume against the 20-day average, a falling market P/E) and the U.S. (SOX, VIX).
// The bar has one row per market; this picks the rows and how strongly the whole bar is styled.
export type HeatGroup = 'tw' | 'us';
export type HeatItem = { id: string; level: 'alert' | 'warn' | 'info'; dir?: 'up' | 'down'; group?: HeatGroup; zh: string; en: string; href?: string };
export type HeatStatus = { items?: HeatItem[]; asOf?: string | null; final?: boolean; checkedAt?: string };
export type HeatPart = { text: string; href: string | null };
export type HeatRow = { group: HeatGroup; label: string; parts: HeatPart[] };
export type Heat = {
  key: string;                       // dismissing hides this exact state; a stronger or different one shows again
  level: HeatItem['level']; dir: 'up' | 'down'; icon: string;
  rows: HeatRow[]; footnote: string;
};

// Only same-site paths are linked, whatever the server sends.
const safeHref = (href?: string) => (href && /^\/(?!\/)/.test(href) ? href : null);
const LABELS: Record<HeatGroup, { zh: string; en: string }> = { tw: { zh: '台股', en: 'TW' }, us: { zh: '美股', en: 'US' } };

// While a heavy-volume or big-swing event is on, the bar is refreshed every minute; on a quiet day it is not shown and
// the server is only asked every few minutes to see whether something started.
export const HEAT_POLL_ACTIVE_MS = 60_000;
export const HEAT_POLL_QUIET_MS = 5 * 60_000;
export const heatPollInterval = (showing: boolean) => (showing ? HEAT_POLL_ACTIVE_MS : HEAT_POLL_QUIET_MS);

export function pickHeat(status: HeatStatus | null | undefined, lang: 'zh' | 'en'): Heat | null {
  const items = status?.items ?? [];
  if (!items.length || !status?.asOf) return null;
  const lead = items[0];                               // the server sends the most severe first
  const dir = lead.dir === 'up' ? 'up' : 'down';
  const live = status.final === false;
  const rows = (['tw', 'us'] as const).flatMap((group) => {
    const own = items.filter((item) => (item.group ?? 'tw') === group);
    return own.length ? [{ group, label: LABELS[group][lang], parts: own.map((item) => ({ text: lang === 'zh' ? item.zh : item.en, href: safeHref(item.href) })) }] : [];
  });
  const footnote = lang === 'zh'
    ? `${status.asOf}${live ? ' 盤中即時' : ' 收盤'} · 證交所／期交所／Yahoo`
    : `${status.asOf} ${live ? 'live' : 'close'} · TWSE / TAIFEX / Yahoo`;
  return {
    key: `market-heat:${status.asOf}:${lead.level}:${items.map((item) => item.id).join(',')}`,
    level: lead.level, dir, icon: lead.level === 'info' ? '📊' : dir === 'up' ? '🚀' : '🔥',
    rows, footnote,
  };
}
