// Text for the AI-search visibility panel at the top of /palais (docs/AI_VISIBILITY.md); tests/palais/aiVisibility.test.ts.
export type Totals = { id: string; at: string; checked: number; appeared: number; unavailable: number; bestRank: number | null };
export type Cell = { keyword: string; platform: string; status: string; appeared: boolean; rank: number | null; cited: boolean; snippet: string; competitors: string[]; change: string };
export type PlatformTotals = { checked: number; appeared: number; bestRank: number | null };
export type VisibilityView = {
  latest: Totals | null; previous: Totals | null; byPlatform: Record<string, PlatformTotals>; cells: Cell[];
  trend: Totals[]; pending: number; week?: string; thisWeek?: string[]; fixes: { runId: string; at: string | null; items: string[] }[];
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
  if (!totals || !totals.checked) return `${name} 無法檢視`;
  return `${name} ${totals.appeared}/${totals.checked}${totals.bestRank ? ` · #${totals.bestRank}` : ''}`;
}

export const MANUAL_PLATFORMS = ['chatgpt', 'grok', 'gemini', 'claude'];
export type ManualCell = { keyword: string; platform: string; outcome: '' | 'appeared' | 'absent' | 'unavailable'; rank: string; cited: boolean };

/** The owner's weekly manual checks become API results; cells left blank were not checked and are not sent. */
export function manualResults(cells: ManualCell[]) {
  return cells.filter((c) => c.outcome).map((c) => {
    const appeared = c.outcome === 'appeared';
    const rank = Number(c.rank);
    return {
      keyword: c.keyword, platform: c.platform, status: c.outcome === 'unavailable' ? 'unavailable' : 'checked', appeared,
      rank: appeared && c.rank !== '' && Number.isInteger(rank) && rank >= 1 && rank <= 20 ? rank : null,
      cited: appeared && c.cited, snippet: '', competitors: [] as string[],
    };
  });
}
