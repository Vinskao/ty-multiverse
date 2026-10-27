export type PortfolioValuePoint = { date: string; totalAssets: number };
export type TokenCostPoint = { period: string; totalEstimatedCostUsd: number };
export type ResearchEconomicsPoint = {
  date: string;
  returnPercent: number;
  cumulativeCostUsd: number;
};

export type PublicPortfolioReturnPoint = { date: string; returnPercent: number };

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

/** Join a public, amount-free portfolio return series with public research-cost estimates. */
export function buildResearchEconomicsFromReturns(
  history: PublicPortfolioReturnPoint[],
  costs: TokenCostPoint[],
): ResearchEconomicsPoint[] {
  const returns = new Map<string, number>();
  for (const point of history) {
    if (validIsoDate(point.date) && Number.isFinite(point.returnPercent)) returns.set(point.date, point.returnPercent);
  }
  const baseline = [...returns.keys()].sort()[0];
  if (!baseline) return [];
  const costsByDate = new Map<string, number>();
  for (const point of costs) {
    if (!validIsoDate(point.period) || !Number.isFinite(point.totalEstimatedCostUsd)) continue;
    costsByDate.set(point.period, (costsByDate.get(point.period) ?? 0) + point.totalEstimatedCostUsd);
  }
  const dates = [...new Set([
    ...[...returns.keys()].filter(date => date >= baseline),
    ...[...costsByDate.keys()].filter(date => date >= baseline),
  ])].sort();
  let latestReturn = returns.get(baseline)!;
  let cumulativeCostUsd = 0;
  return dates.map(date => {
    if (returns.has(date)) latestReturn = returns.get(date)!;
    cumulativeCostUsd += costsByDate.get(date) ?? 0;
    return { date, returnPercent: latestReturn, cumulativeCostUsd };
  });
}

/** Provider the scheduled cloud routines export their usage under (see maya-sawa `/otel/v1/metrics`). */
export const ROUTINE_PROVIDER = 'claude-routine';

/** Daily token-cost rows (one per day, provider and model) from `/ai-usage/daily` for one provider; malformed rows are dropped. */
export function tokenCostsFromDaily(payload: unknown, provider: string = ROUTINE_PROVIDER): TokenCostPoint[] {
  const rows = (payload as { data?: unknown } | null)?.data;
  if (!Array.isArray(rows)) return [];
  return rows.flatMap((row) => {
    const { period, totalEstimatedCostUsd, aiProvider } = (row ?? {}) as Partial<TokenCostPoint> & { aiProvider?: string };
    return aiProvider === provider && typeof period === 'string' && typeof totalEstimatedCostUsd === 'number' && Number.isFinite(totalEstimatedCostUsd)
      ? [{ period, totalEstimatedCostUsd }] : [];
  });
}
