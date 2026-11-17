// The market-status banner (2026-11-17). maya-sawa's /api/market/dashboard/status describes only TODAY (live index,
// volume against the 20-day average, a falling market P/E); this picks what the banner shows and how strongly.
export type HeatItem = { id: string; level: 'alert' | 'warn' | 'info'; dir?: 'up' | 'down'; zh: string; en: string; href?: string };
export type HeatStatus = { items?: HeatItem[]; asOf?: string | null; final?: boolean; checkedAt?: string };
export type Heat = {
  key: string;                       // dismissing hides this exact state; a stronger or different one shows again
  level: HeatItem['level']; dir: 'up' | 'down'; icon: string;
  headline: string; href: string | null;            // the headline links to the page that shows the number
  details: { text: string; href: string | null }[]; footnote: string;
};

// Only same-site paths are linked, whatever the server sends.
const safeHref = (href?: string) => (href && /^\/(?!\/)/.test(href) ? href : null);

export function pickHeat(status: HeatStatus | null | undefined, lang: 'zh' | 'en'): Heat | null {
  const items = status?.items ?? [];
  if (!items.length || !status?.asOf) return null;
  const [lead, ...rest] = items;
  const dir = lead.dir === 'up' ? 'up' : 'down';
  const label = (item: HeatItem) => (lang === 'zh' ? item.zh : item.en);
  const live = status.final === false;
  const footnote = lang === 'zh'
    ? `${status.asOf}${live ? ' 盤中即時' : ' 收盤'} · 證交所／期交所／Yahoo`
    : `${status.asOf} ${live ? 'live' : 'close'} · TWSE / TAIFEX / Yahoo`;
  return {
    key: `market-heat:${status.asOf}:${lead.id}:${lead.level}:${rest.map((item) => item.id).join(',')}`,
    level: lead.level, dir, icon: lead.level === 'info' ? '📊' : dir === 'up' ? '🚀' : '🔥',
    headline: label(lead), href: safeHref(lead.href), details: rest.map((item) => ({ text: label(item), href: safeHref(item.href) })), footnote,
  };
}
