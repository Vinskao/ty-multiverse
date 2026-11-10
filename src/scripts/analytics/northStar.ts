import { formatNumber } from '../format/numbers';

export type NorthStarWeek = { weekStart: string; weekEnd: string; activeReaders: number; returningReaders: number; events: Record<string, number> };

/** Owner readout: weekly returning research readers, newest week first (docs/NORTH_STAR.md). */
export function northStarLine(weeks: readonly NorthStarWeek[], lang: 'zh' | 'en'): string {
  if (!weeks.length) return lang === 'zh' ? '尚無讀者資料' : 'No reader data yet';
  const count = (value: number) => formatNumber(value, 'count');
  const [current, previous] = weeks;
  if (lang === 'zh') {
    const now = `本週回訪研究讀者 ${count(current.returningReaders)} 人（活躍 ${count(current.activeReaders)} 人）`;
    return previous ? `${now}· 上週 ${count(previous.returningReaders)} 人（活躍 ${count(previous.activeReaders)} 人）` : now;
  }
  const now = `Returning research readers this week: ${count(current.returningReaders)} (${count(current.activeReaders)} active)`;
  return previous ? `${now} · last week: ${count(previous.returningReaders)} (${count(previous.activeReaders)} active)` : now;
}
