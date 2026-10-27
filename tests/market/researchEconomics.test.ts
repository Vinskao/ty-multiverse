import { describe, expect, it } from 'vitest';
import { buildResearchEconomicsSeries } from '../../src/scripts/market/researchEconomics';

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
