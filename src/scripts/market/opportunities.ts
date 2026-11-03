import { analysisRating } from './analysisRating';

/** A missing, unparseable or unavailable analysis cannot establish a buy rating. */
export async function buyOpportunities<T>(items: T[], readAnalysis: (item: T) => Promise<string | null>): Promise<T[]> {
  const ratings = await Promise.all(items.map(async item => {
    try { return analysisRating(await readAnalysis(item)); } catch { return null; }
  }));
  return items.filter((_, index) => ratings[index] === 'buy');
}
