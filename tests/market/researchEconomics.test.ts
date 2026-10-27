import { describe, expect, it } from 'vitest';
import { buildResearchEconomicsSeries, tokenCostsFromDaily } from '../../src/scripts/market/researchEconomics';

describe('research cost and portfolio return series', () => {
  it('uses the first valid portfolio value as the return baseline and aligns cumulative costs by date', () => {
    expect(buildResearchEconomicsSeries(
      [
        { date: '2026-04-01', totalAssets: 0 },
        { date: '2026-04-02', totalAssets: 100_000 },
        { date: '2026-04-04', totalAssets: 110_000 },
      ],
      [
        { period: '2026-04-01', totalEstimatedCostUsd: 2 },
        { period: '2026-04-02', totalEstimatedCostUsd: 1 },
        { period: '2026-04-03', totalEstimatedCostUsd: 3 },
      ],
    )).toEqual([
      { date: '2026-04-02', returnPercent: 0, cumulativeCostUsd: 1 },
      { date: '2026-04-03', returnPercent: 0, cumulativeCostUsd: 4 },
      { date: '2026-04-04', returnPercent: 10, cumulativeCostUsd: 4 },
    ]);
  });

  it('aggregates duplicate daily costs, ignores malformed values, and returns no series without a baseline', () => {
    expect(buildResearchEconomicsSeries(
      [{ date: '2026-04-02', totalAssets: 200 }],
      [
        { period: '2026-04-02', totalEstimatedCostUsd: 0.25 },
        { period: '2026-04-02', totalEstimatedCostUsd: 0.75 },
        { period: 'invalid', totalEstimatedCostUsd: 20 },
        { period: '2026-04-03', totalEstimatedCostUsd: Number.NaN },
      ],
    )).toEqual([
      { date: '2026-04-02', returnPercent: 0, cumulativeCostUsd: 1 },
    ]);

    expect(buildResearchEconomicsSeries([{ date: '2026-04-02', totalAssets: 0 }], [])).toEqual([]);
  });
});

describe('token cost rows from the ai-usage daily endpoint', () => {
  // shaped like the real /ai-usage/daily response (2026-10-27): one row per day, provider and model.
  // "claude-routine" is what the scheduled cloud routines export; claude-code and codex are this machine's own usage.
  const payload = {
    success: true,
    data: [
      { period: '2026-10-27', aiProvider: 'claude-code', modelName: 'claude-sonnet-5-5', totalTokens: 5966346, totalEstimatedCostUsd: 2.3663397, callCount: 1 },
      { period: '2026-10-27', aiProvider: 'claude-routine', modelName: 'claude-opus-5-5', totalTokens: 900000, totalEstimatedCostUsd: 1.5, callCount: 1 },
      { period: '2026-10-22', aiProvider: 'codex', modelName: 'gpt-6.1-sol', totalTokens: 66233666, totalEstimatedCostUsd: 8.9779016, callCount: 2 },
      { period: '2026-10-22', aiProvider: 'claude-routine', modelName: 'claude-sonnet-5-5', totalTokens: 400000, totalEstimatedCostUsd: 0.75, callCount: 1 },
      { period: '2026-10-22', aiProvider: 'claude-routine', modelName: 'claude-opus-5-5', totalTokens: 300000, totalEstimatedCostUsd: 0.5, callCount: 1 },
    ],
  };

  it('keeps only the scheduled routines, one row per model, so the series sums them per day', () => {
    const costs = tokenCostsFromDaily(payload);
    expect(costs).toEqual([
      { period: '2026-10-27', totalEstimatedCostUsd: 1.5 },
      { period: '2026-10-22', totalEstimatedCostUsd: 0.75 },
      { period: '2026-10-22', totalEstimatedCostUsd: 0.5 },
    ]);
    const series = buildResearchEconomicsSeries([{ date: '2026-10-12', totalAssets: 100 }, { date: '2026-10-27', totalAssets: 90 }], costs);
    expect(series.map((row) => row.date)).toEqual(['2026-10-12', '2026-10-22', '2026-10-27']);
    expect(series[1].cumulativeCostUsd).toBeCloseTo(1.25, 6);
    expect(series[2].cumulativeCostUsd).toBeCloseTo(2.75, 6);
  });

  it('can read another provider and drops malformed rows or an unexpected payload', () => {
    expect(tokenCostsFromDaily(payload, 'codex')).toEqual([{ period: '2026-10-22', totalEstimatedCostUsd: 8.9779016 }]);
    const bad = { data: [{ period: '2026-10-27', aiProvider: 'claude-routine', totalEstimatedCostUsd: '2.5' }, { period: 5 }, null, { period: '2026-10-26', aiProvider: 'claude-routine', totalEstimatedCostUsd: 1 }] };
    expect(tokenCostsFromDaily(bad)).toEqual([{ period: '2026-10-26', totalEstimatedCostUsd: 1 }]);
    expect(tokenCostsFromDaily(null)).toEqual([]);
    expect(tokenCostsFromDaily({ data: 'x' })).toEqual([]);
  });
});
