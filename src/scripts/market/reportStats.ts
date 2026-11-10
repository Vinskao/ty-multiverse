import { groupReportDocuments, reportHasAnalyzableText, reportTagIdForReport, type MarketReport } from './reports';
import type { ResearchTagId } from './researchTaxonomy';

export type ReportTopicStat = { tagId: ResearchTagId; reports: number; claims: number; tailwind: number; neutral: number; headwind: number };
export type ReportStats = { reports: number; claims: number; sources: number; addedLast7Days: number; ranking: ReportTopicStat[] };

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Homepage numbers for the report library. Counts the same documents the report list shows: textless failed
 * imports are left out and a split SEC filing is one document. 其他產業 is counted in the totals but not ranked.
 */
export function summarizeReports(reports: readonly MarketReport[], now: Date = new Date(), topics = 6): ReportStats {
  const visible = reports.filter(reportHasAnalyzableText);
  const sources = new Set(visible.map(({ publisher }) => (publisher ?? '').trim()).filter(Boolean));
  const byTopic = new Map<ResearchTagId, ReportTopicStat>();
  let claims = 0;
  let addedLast7Days = 0;
  for (const group of groupReportDocuments(visible)) {
    const groupClaims = group.reports.flatMap((report) => report.claims ?? []);
    const count = group.reports.reduce((sum, report) => sum + Math.max(report.claim_count ?? 0, report.claims?.length ?? 0), 0);
    claims += count;
    const received = group.reports.map(({ received_at }) => Date.parse(received_at ?? '')).filter(Number.isFinite);
    const age = received.length ? now.getTime() - Math.max(...received) : Infinity;
    if (age >= 0 && age <= WEEK_MS) addedLast7Days += 1;
    const tagId = reportTagIdForReport({ title: group.title, claims: groupClaims });
    if (tagId === 'other') continue;
    const topic = byTopic.get(tagId) ?? { tagId, reports: 0, claims: 0, tailwind: 0, neutral: 0, headwind: 0 };
    topic.reports += 1;
    topic.claims += count;
    for (const { direction } of groupClaims) topic[direction] += 1;
    byTopic.set(tagId, topic);
  }
  const ranking = [...byTopic.values()]
    .sort((a, b) => b.claims - a.claims || b.reports - a.reports || a.tagId.localeCompare(b.tagId))
    .slice(0, topics);
  return { reports: groupReportDocuments(visible).length, claims, sources: sources.size, addedLast7Days, ranking };
}

/** Share of directional claims that are tailwinds, as a whole percent; null when a topic has no directional claim. */
export function tailwindShare(topic: Pick<ReportTopicStat, 'tailwind' | 'headwind'>): number | null {
  const directional = topic.tailwind + topic.headwind;
  return directional ? Math.round((topic.tailwind / directional) * 100) : null;
}
