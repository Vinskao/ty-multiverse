// Server-only: homepage numbers for the report library (reports, claims, sources, topic ranking).
// The report list is large and Maya Sawa runs on a small node, so the result is kept for ten minutes and a slow
// or failed request never stalls the page: the homepage shows the last good numbers, or no numbers at all.
import { summarizeReports, type ReportStats } from '../../scripts/market/reportStats';

const MAYA_SAWA_URL = process.env.MAYA_SAWA_INTERNAL_URL || import.meta.env.MAYA_SAWA_INTERNAL_URL || 'http://maya-sawa/maya-sawa';
const TIMEOUT_MS = 2_500;
const FRESH_MS = 10 * 60 * 1000;

let lastGood: { stats: ReportStats; at: number } | null = null;
let inflight: Promise<ReportStats> | null = null;

async function fetchStats(): Promise<ReportStats> {
  const response = await fetch(`${MAYA_SAWA_URL}/market/reports`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const payload = await response.json() as { reports?: unknown };
  const stats = summarizeReports(Array.isArray(payload.reports) ? payload.reports : []);
  lastGood = { stats, at: Date.now() };
  return stats;
}

export async function getReportStats(): Promise<ReportStats | null> {
  if (lastGood && Date.now() - lastGood.at < FRESH_MS) return lastGood.stats;
  if (!inflight) inflight = fetchStats().finally(() => { inflight = null; });
  const request = inflight;
  try {
    const value = await Promise.race([request, new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), TIMEOUT_MS))]);
    if (value !== undefined) return value;
  } catch (error) {
    console.error('Report statistics unavailable:', error);
  }
  request.catch(() => undefined); // a late failure after the timeout is already handled by the fallback
  return lastGood?.stats ?? null;
}
