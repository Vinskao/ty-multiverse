export type PortfolioValuePoint = { date: string; totalAssets: number };
export type TokenCostPoint = { period: string; totalEstimatedCostUsd: number };
export type ResearchEconomicsPoint = {
  date: string;
  returnPercent: number;
  cumulativeCostUsd: number;
};

const validIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value)
  && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

/** Align cumulative token cost with portfolio return from the earliest positive asset snapshot. */
export function buildResearchEconomicsSeries(
  portfolio: PortfolioValuePoint[],
  costs: TokenCostPoint[],
): ResearchEconomicsPoint[] {
  const values = new Map<string, number>();
  for (const point of portfolio) {
    if (validIsoDate(point.date) && Number.isFinite(point.totalAssets) && point.totalAssets >= 0) {
      values.set(point.date, point.totalAssets);
    }
  }
  const baseline = [...values].filter(([, value]) => value > 0).sort(([a], [b]) => a.localeCompare(b))[0];
  if (!baseline) return [];

  const costsByDate = new Map<string, number>();
  for (const point of costs) {
    if (!validIsoDate(point.period) || !Number.isFinite(point.totalEstimatedCostUsd)) continue;
    costsByDate.set(point.period, (costsByDate.get(point.period) ?? 0) + point.totalEstimatedCostUsd);
  }

  const dates = [...new Set([
    ...[...values.keys()].filter((date) => date >= baseline[0]),
    ...[...costsByDate.keys()].filter((date) => date >= baseline[0]),
  ])].sort();
  let latestAssets = baseline[1];
  let cumulativeCostUsd = 0;
  let portfolioIndex = 0;
  const sortedValues = [...values].sort(([a], [b]) => a.localeCompare(b));

  return dates.map((date) => {
    while (portfolioIndex < sortedValues.length && sortedValues[portfolioIndex][0] <= date) {
      latestAssets = sortedValues[portfolioIndex][1];
      portfolioIndex += 1;
    }
    cumulativeCostUsd += costsByDate.get(date) ?? 0;
    return {
      date,
      returnPercent: Math.round((((latestAssets / baseline[1]) - 1) * 100) * 1_000_000) / 1_000_000,
      cumulativeCostUsd,
    };
  });
}

/** Daily token-cost rows (one per day, provider and model) from `/ai-usage/daily`; anything malformed is dropped. */
export function tokenCostsFromDaily(payload: unknown): TokenCostPoint[] {
  const rows = (payload as { data?: unknown } | null)?.data;
  if (!Array.isArray(rows)) return [];
  return rows.flatMap((row) => {
    const { period, totalEstimatedCostUsd } = (row ?? {}) as Partial<TokenCostPoint>;
    return typeof period === 'string' && typeof totalEstimatedCostUsd === 'number' && Number.isFinite(totalEstimatedCostUsd)
      ? [{ period, totalEstimatedCostUsd }] : [];
  });
}
