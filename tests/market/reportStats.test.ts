import { describe, expect, it } from 'vitest';
import { reportRecencyWeights, summarizeReports, tailwindShare } from '../../src/scripts/market/reportStats';
import type { MarketReport } from '../../src/scripts/market/reports';

const NOW = new Date('2026-11-10T04:00:00Z');
const report = (over: Partial<MarketReport>): MarketReport => ({
  id: 'r', title: '報告', publisher: '來源甲', published_at: null, received_at: '2026-10-01T00:00:00Z', source_url: null,
  page_count: 3, visibility: 'public', status: 'ready', claim_count: 0, claims: [], ...over,
});
const claim = (segment: string, direction: 'tailwind' | 'neutral' | 'headwind') => ({ page: 1, segment, direction, claim: '主張' });

describe('homepage report statistics', () => {
  it('returns zeros and an empty ranking when there are no reports', () => {
    expect(summarizeReports([], NOW)).toEqual({ reports: 0, claims: 0, sources: 0, addedLast7Days: 0, ranking: [] });
  });

  it('counts documents, claims, distinct sources and what was recorded in the last seven days', () => {
    const stats = summarizeReports([
      report({ id: 'a', publisher: '來源甲', received_at: '2026-11-09T10:00:00Z', claim_count: 2, claims: [claim('foundry', 'tailwind'), claim('foundry', 'headwind')] }),
      report({ id: 'b', publisher: ' 來源甲 ', received_at: '2026-11-03T05:00:00Z', claim_count: 1, claims: [claim('thermal', 'tailwind')] }),
      report({ id: 'c', publisher: '來源乙', received_at: '2026-11-03T03:59:00Z', claim_count: 1, claims: [claim('thermal', 'neutral')] }),
      report({ id: 'd', publisher: '', received_at: undefined, claim_count: 0 }),
    ], NOW);
    expect(stats.reports).toBe(4);
    expect(stats.claims).toBe(4);
    expect(stats.sources).toBe(2); // trimmed duplicates count once; a blank publisher is not a source
    expect(stats.addedLast7Days).toBe(2); // c is one minute older than seven days; d has no recorded time
  });

  it('counts an SEC filing split into same-URL sections as one document', () => {
    const url = 'https://www.sec.gov/Archives/edgar/data/1/000/filing.htm';
    const stats = summarizeReports([
      report({ id: 's1', publisher: 'SEC EDGAR', source_url: url, title: 'NVDA 10-Q｜Risk', claim_count: 1, claims: [claim('foundry', 'headwind')] }),
      report({ id: 's2', publisher: 'SEC EDGAR', source_url: url, title: 'NVDA 10-Q｜MD&A', claim_count: 2, claims: [claim('foundry', 'tailwind'), claim('foundry', 'tailwind')] }),
    ], NOW);
    expect(stats.reports).toBe(1);
    expect(stats.claims).toBe(3);
    expect(stats.ranking).toEqual([{
      tagId: 'semiconductor', reports: 1, claims: 3, tailwind: 2, neutral: 0, headwind: 1,
      directionalWeight: { tailwind: 0, headwind: 0 },
    }]);
  });

  it('leaves out failed imports without text, exactly like the report list', () => {
    const stats = summarizeReports([
      report({ id: 'ok', claim_count: 1, claims: [claim('optical', 'tailwind')] }),
      report({ id: 'bad', publisher: '來源丙', status: 'failed', failure_reason: 'PDF 沒有文字層' }),
    ], NOW);
    expect(stats.reports).toBe(1);
    expect(stats.sources).toBe(1);
  });

  it('ranks research topics by claims, then reports, and keeps 其他產業 out of the ranking', () => {
    const stats = summarizeReports([
      report({ id: '1', title: '散熱', claim_count: 1, claims: [claim('thermal', 'tailwind')] }),
      report({ id: '2', title: '晶圓代工', claim_count: 3, claims: [claim('foundry', 'tailwind'), claim('memory', 'headwind'), claim('foundry', 'neutral')] }),
      report({ id: '3', title: '液冷', claim_count: 1, claims: [claim('thermal', 'headwind')] }),
      report({ id: '4', title: '利率展望', claim_count: 5, claims: Array.from({ length: 5 }, () => claim('macroeconomics', 'neutral')) }),
    ], NOW);
    expect(stats.ranking.map(({ tagId }) => tagId)).toEqual(['semiconductor', 'cooling']);
    expect(stats.ranking[1]).toEqual({
      tagId: 'cooling', reports: 2, claims: 2, tailwind: 1, neutral: 0, headwind: 1,
      directionalWeight: { tailwind: 0, headwind: 0 },
    });
    expect(stats.claims).toBe(10); // the total still includes claims outside the ranked topics
  });

  it('uses the claim count from the server when the list payload carries no claim text', () => {
    expect(summarizeReports([report({ id: 'n', claim_count: 7, claims: [] })], NOW).claims).toBe(7);
  });

  it('keeps at most the requested number of topics', () => {
    const reports = [['foundry', 3], ['thermal', 2], ['optical', 1]].map(([segment, count], index) =>
      report({ id: String(index), claim_count: count as number, claims: Array.from({ length: count as number }, () => claim(segment as string, 'tailwind')) }));
    expect(summarizeReports(reports, NOW, 2).ranking.map(({ tagId }) => tagId)).toEqual(['semiconductor', 'cooling']);
  });
});

describe('time-weighted report direction', () => {
  const annual = (over: Partial<MarketReport> = {}) => report({
    id: 'annual', title: '台積電 2025 年股東會年報｜產業與技術摘錄',
    published_at: '2026-05-01', ...over,
  });
  const dated = (id: string, day: string | null, direction: 'tailwind' | 'headwind') => report({
    id, published_at: day, received_at: '2026-11-10T01:00:00Z',
    claim_count: 1, claims: [claim('foundry', direction)],
  });

  it('exposes the same per-report factors used by the ranking and why a report is excluded', () => {
    const reports = [annual(), dated('new', '2026-11-10', 'tailwind'), dated('old', '2026-08-12', 'headwind'),
      dated('excluded', '2026-04-30', 'tailwind'), dated('missing', null, 'tailwind'), dated('future', '2026-11-11', 'headwind')];
    const weights = reportRecencyWeights(reports, NOW);
    expect(weights.get('new')).toMatchObject({ weight: 1, ageDays: 0 });
    expect(weights.get('old')).toMatchObject({ weight: 0.5, ageDays: 90 });
    expect(weights.get('excluded')).toMatchObject({ weight: 0, reason: 'before-cutoff', cutoffDate: '2026-05-01' });
    expect(weights.get('missing')).toMatchObject({ weight: 0, reason: 'undated' });
    expect(weights.get('future')).toMatchObject({ weight: 0, reason: 'future' });
  });

  it('drops pre-annual, undated and future claims and halves weight every 90 days', () => {
    const [topic] = summarizeReports([
      annual(), dated('before', '2026-04-30', 'tailwind'),
      dated('old', '2026-08-12', 'headwind'), dated('new', '2026-11-10', 'tailwind'),
      dated('unknown', null, 'headwind'), dated('future', '2026-11-11', 'headwind'),
    ], NOW).ranking;
    expect(topic.claims).toBe(5);
    expect(topic.directionalWeight).toEqual({ tailwind: 1, headwind: 0.5 });
    expect(tailwindShare(topic)).toBe(67);
  });

  it('uses the previous Taipei fiscal year, includes the cutoff day and falls back to annual ingestion dates', () => {
    const [topic] = summarizeReports([
      annual({ published_at: null, received_at: '2026-05-01T17:00:00Z' }),
      annual({ id: 'earlier-year', title: '台積電 2024 年股東會年報｜產業與技術摘錄', published_at: '2025-05-01' }),
      dated('before', '2026-05-01', 'headwind'), dated('on', '2026-05-02', 'tailwind'),
    ], NOW).ranking;
    expect(tailwindShare(topic)).toBe(100);
  });

  it('uses the earliest known publication over ingestion and keeps neutral claims out of the denominator', () => {
    const [topic] = summarizeReports([
      annual(), annual({ id: 'later', published_at: '2026-06-01' }),
      annual({ id: 'undated', published_at: null, received_at: '2026-04-01T00:00:00Z' }),
      dated('before', '2026-04-25', 'headwind'), dated('on', '2026-05-01', 'tailwind'),
      report({ id: 'neutral', published_at: '2026-11-10', claims: [claim('foundry', 'neutral')] }),
    ], NOW).ranking;
    expect(topic.neutral).toBe(1);
    expect(tailwindShare(topic)).toBe(100);
  });

  it('leaves the share unavailable without a previous-year annual or eligible directional claims', () => {
    expect(tailwindShare(summarizeReports([dated('new', '2026-11-10', 'tailwind')], NOW).ranking[0])).toBeNull();
    expect(tailwindShare(summarizeReports([annual(), dated('before', '2026-04-30', 'headwind')], NOW).ranking[0])).toBeNull();
  });
});
