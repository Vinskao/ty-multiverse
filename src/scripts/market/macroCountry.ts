import type { MacroGroupSpec } from './macroGroups';
export type MacroCountry = 'us' | 'tw' | 'ez' | 'uk' | 'jp' | 'kr';
const names: Record<MacroCountry, RegExp> = {
  us: /\bU\.S\.|United States|美國/i, tw: /Taiwan|台灣/i, ez: /Euro area|ECB|歐元區|歐洲央行/i,
  uk: /\bUK\b|United Kingdom|英國/i, jp: /Japan|日本/i, kr: /Korea|韓國/i,
};
export function prioritizeMacroGroups<T extends MacroGroupSpec>(groups: readonly T[], country: MacroCountry | null): T[] {
  if (!country) return [...groups];
  const matches = (group: T) => group.metrics.some(metric =>
    names[country].test(`${metric.label.en} ${'zh' in metric.label ? metric.label.zh : ''}`)
    || (country === 'us' && 'key' in metric.label));
  return [...groups.filter(matches), ...groups.filter(group => !matches(group))];
}
