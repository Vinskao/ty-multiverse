// Every macro indicator drawn on the 總體 page, searchable from the nav bar by Chinese or English name or series
// code. Built from the same MACRO_GROUP_SPECS the page renders, so a new indicator is searchable automatically.
import i18nData from '../../storages/i18n.json';
import { MACRO_GROUP_SPECS, type MacroText } from '../market/macroGroups';
import type { BenchmarkEntry } from './benchmarkIndex';

const home = (i18nData as unknown as { home: Record<string, { en: string; zh: string }> }).home;
const both = (text: MacroText) => 'key' in text ? (home[text.key] ?? { en: text.en, zh: text.en }) : text;

export function buildMacroIndex(): BenchmarkEntry[] {
  const entries: BenchmarkEntry[] = [{ kind: 'macro', title: '總經評論', detail: '所有個股分析共用的總經前提',
    text: '總經評論 總經 總體 macro commentary', href: '/macro/#macro-commentary' }];
  for (const group of MACRO_GROUP_SPECS) {
    const title = both(group.title);
    for (const metric of group.metrics) {
      const label = both(metric.label);
      entries.push({ kind: 'macro', title: label.zh, detail: `${title.zh}・${label.en}・${metric.code}`,
        text: [label.zh, label.en, metric.code, title.zh, title.en].join(' '),
        href: `/macro/?${new URLSearchParams({ series: metric.code, group: group.id })}` });
    }
  }
  return entries;
}
