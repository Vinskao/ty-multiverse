import { benchmarkAnnualFiscalYear, groupReportDocuments, reportHasAnalyzableText, reportTagIdForReport, type MarketReport } from './reports';
import type { ResearchTagId } from './researchTaxonomy';

export type ReportTopicStat = { tagId: ResearchTagId; reports: number; claims: number; tailwind: number; neutral: number; headwind: number;
  directionalWeight: { tailwind: number; headwind: number } };
export type ReportStats = { reports: number; claims: number; sources: number; addedLast7Days: number; ranking: ReportTopicStat[] };

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const HALF_LIFE_MS = 90 * DAY_MS;
const taipeiDate = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Taipei', dateStyle: 'short' });

function publicationDay(value: string | null): number {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
  const day = Date.parse(value);
  return Number.isFinite(day) && new Date(day).toISOString().slice(0, 10) === value ? day : NaN;
}

function recordedDay(report: MarketReport): number {
  const received = Date.parse(report.received_at ?? '');
  return Number.isFinite(received) ? publicationDay(taipeiDate.format(received)) : NaN;
}

export type ReportRecency = {
  weight: number;
  ageDays: number | null;
  cutoffDate: string | null;
  reason: 'undated' | 'future' | 'no-cutoff' | 'before-cutoff' | null;
};

export function reportRecencyWeights(reports: readonly MarketReport[], now = new Date()): Map<string, ReportRecency> {
  const today = taipeiDate.format(now);
  const asOf = publicationDay(today);
  const previousYear = Number(today.slice(0, 4)) - 1;
  const annuals = reports.filter((report) => reportHasAnalyzableText(report) && benchmarkAnnualFiscalYear(report) === previousYear);
  const publishedCutoff = Math.min(...annuals.map((report) => publicationDay(report.published_at)).filter((day) => day <= asOf));
  const useRecordedAnnual = !Number.isFinite(publishedCutoff);
  const cutoff = useRecordedAnnual ? Math.min(...annuals.map(recordedDay).filter((day) => day <= asOf)) : publishedCutoff;
  const cutoffDate = Number.isFinite(cutoff) ? new Date(cutoff).toISOString().slice(0, 10) : null;
  const weights = new Map<string, ReportRecency>();
  for (const report of reports) {
    const published = publicationDay(report.published_at);
    const day = useRecordedAnnual && !Number.isFinite(published) && benchmarkAnnualFiscalYear(report) === previousYear
      ? recordedDay(report) : published;
    const ageDays = Number.isFinite(day) ? (asOf - day) / DAY_MS : null;
    const reason = ageDays === null ? 'undated' : ageDays < 0 ? 'future'
      : !Number.isFinite(cutoff) ? 'no-cutoff' : day < cutoff ? 'before-cutoff' : null;
    weights.set(report.id, { ageDays, cutoffDate, reason, weight: reason ? 0 : 2 ** ((day - asOf) / HALF_LIFE_MS) });
  }
  return weights;
}

/**
 * Homepage numbers for the report library. Counts the same documents the report list shows: textless failed
 * imports are left out and a split SEC filing is one document. 其他產業 is counted in the totals but not ranked.
 */
export function summarizeReports(reports: readonly MarketReport[], now: Date = new Date(), topics = 6): ReportStats {
  const visible = reports.filter(reportHasAnalyzableText);
  const weights = reportRecencyWeights(visible, now);
  const sources = new Set(visible.map(({ publisher }) => (publisher ?? '').trim()).filter(Boolean));
  const byTopic = new Map<ResearchTagId, ReportTopicStat>();
  let claims = 0;
  let addedLast7Days = 0;
  const groups = groupReportDocuments(visible);
  for (const group of groups) {
    const groupClaims = group.reports.flatMap((report) => report.claims ?? []);
    const count = group.reports.reduce((sum, report) => sum + Math.max(report.claim_count ?? 0, report.claims?.length ?? 0), 0);
    claims += count;
    const received = group.reports.map(({ received_at }) => Date.parse(received_at ?? '')).filter(Number.isFinite);
    const age = received.length ? now.getTime() - Math.max(...received) : Infinity;
    if (age >= 0 && age <= WEEK_MS) addedLast7Days += 1;
    const tagId = reportTagIdForReport({ title: group.title, claims: groupClaims });
    if (tagId === 'other') continue;
    const topic = byTopic.get(tagId) ?? {
      tagId, reports: 0, claims: 0, tailwind: 0, neutral: 0, headwind: 0,
      directionalWeight: { tailwind: 0, headwind: 0 },
    };
    topic.reports += 1;
    topic.claims += count;
    for (const report of group.reports) {
      const weight = weights.get(report.id)?.weight ?? 0;
      for (const { direction } of report.claims ?? []) {
        topic[direction] += 1;
        if (direction !== 'neutral') topic.directionalWeight[direction] += weight;
      }
    }
    byTopic.set(tagId, topic);
  }
  const ranking = [...byTopic.values()]
    .sort((a, b) => b.claims - a.claims || b.reports - a.reports || a.tagId.localeCompare(b.tagId))
    .slice(0, topics);
  return { reports: groups.length, claims, sources: sources.size, addedLast7Days, ranking };
}

/** Share of eligible directional weight that is tailwind, as a whole percent. */
export function tailwindShare({ directionalWeight: { tailwind, headwind } }: Pick<ReportTopicStat, 'directionalWeight'>): number | null {
  const directional = tailwind + headwind;
  return directional ? Math.round((tailwind / directional) * 100) : null;
}
