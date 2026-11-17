// Text for the AI-search visibility panel at the top of /palais (docs/AI_VISIBILITY.md); tests/palais/aiVisibility.test.ts.
export type Totals = { id: string; at: string; checked: number; appeared: number; unavailable: number; bestRank: number | null };
export type Cell = { keyword: string; platform: string; status: string; appeared: boolean; rank: number | null; cited: boolean; snippet: string; competitors: string[]; change: string };
export type PlatformTotals = { checked: number; appeared: number; bestRank: number | null };
export type SocialItem = { platform: string; metric: string; label: string; value: number; asOf: string; weekChange: number | null; comparedWith: string | null; sinceFirst: number | null; firstDay: string };
export type SocialView = { items: SocialItem[]; unavailable: { platform: string; reason: string }[]; today: string };

/** "+3（較 11/09）", "持平（較 11/09）", or since when it is recorded. Never shows 0 when there is nothing to compare with. */
export function socialChange(item: SocialItem): string {
  if (item.weekChange === null || !item.comparedWith) {
    return item.sinceFirst === null ? `自 ${item.firstDay.slice(5).replace('-', '/')} 起記錄`
      : `${item.sinceFirst > 0 ? '+' : ''}${item.sinceFirst}（自 ${item.firstDay.slice(5).replace('-', '/')} 起）`;
  }
  const since = `較 ${item.comparedWith.slice(5).replace('-', '/')}`;
  if (item.weekChange === 0) return `持平（${since}）`;
  return `${item.weekChange > 0 ? '+' : ''}${item.weekChange}（${since}）`;
}

export function socialTrend(item: SocialItem): 'up' | 'down' | 'flat' {
  const change = item.weekChange ?? item.sinceFirst ?? 0;
  return change > 0 ? 'up' : change < 0 ? 'down' : 'flat';
}

export type VisibilityView = {
  latest: Totals | null; previous: Totals | null; byPlatform: Record<string, PlatformTotals>; cells: Cell[];
  trend: Totals[]; pending: number; social?: SocialView | null; week?: string; thisWeek?: string[]; fixes: { runId: string; at: string | null; items: string[] }[];
};

export const PLATFORM_NAMES: Record<string, string> = { chatgpt: 'ChatGPT', grok: 'Grok', gemini: 'Gemini', claude: 'Claude' };

export function headline(view: VisibilityView): string {
  if (!view.latest) return `尚無已審核的檢視結果${view.pending ? `（${view.pending} 份待審）` : ''}`;
  const { checked, appeared, unavailable, bestRank } = view.latest;
  const parts = [`出現 ${appeared}/${checked} 格${view.previous ? `（上次 ${view.previous.appeared}/${view.previous.checked}）` : ''}`];
  if (bestRank) parts.push(`最佳名次 #${bestRank}`);
  if (unavailable) parts.push(`${unavailable} 格無法檢視`);
  return parts.join(' · ');
}

const ARROWS: Record<string, string> = { up: ' ▲', down: ' ▼', lost: ' 消失', new: ' 新' };

export function cellLabel(cell: Cell): string {
  if (cell.status !== 'checked') return '無法檢視';
  if (!cell.appeared) return cell.change === 'lost' ? '未出現 消失' : '未出現';
  return `${cell.rank ? `#${cell.rank}` : '出現'}${ARROWS[cell.change] ?? ''}`;
}

export function platformLine(platform: string, totals: PlatformTotals | undefined): string {
  const name = PLATFORM_NAMES[platform] ?? platform;
  if (platform === 'grok') return 'Grok 已棄用';
  if (!AUTO_PLATFORMS.includes(platform) && !totals?.checked) return `${name} 暫停（需 API 額度）`;
  if (!totals || !totals.checked) return `${name} 無法檢視`;
  return `${name} ${totals.appeared}/${totals.checked}${totals.bestRank ? ` · #${totals.bestRank}` : ''}`;
}

/** Checked without the owner: Gemini by the backend's free API probe, Claude by the Monday routine. ChatGPT / Grok need paid API credit. */
export const AUTO_PLATFORMS = ['gemini', 'claude'];
