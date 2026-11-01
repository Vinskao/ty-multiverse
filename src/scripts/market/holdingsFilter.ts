// The holdings panel and the report list share one industry choice: picking an industry in either place selects it in both.
export type HoldingRow = { key: string; label: string; tagIds: ReadonlyArray<string> };
export type HoldingFilter = HoldingRow & { count: number };

export function holdingFilters(rows: ReadonlyArray<HoldingRow>): HoldingFilter[] {
  const filters = new Map<string, HoldingFilter>();
  for (const row of rows) {
    const found = filters.get(row.key);
    if (found) found.count += 1;
    else filters.set(row.key, { ...row, count: 1 });
  }
  return [...filters.values()];
}

export function reportTagForFilter(filter: HoldingFilter): string | undefined {
  return filter.tagIds[0];
}

export function filterForReportTag(filters: ReadonlyArray<HoldingFilter>, tagId: string): HoldingFilter | undefined {
  return filters.find((filter) => filter.tagIds.includes(tagId));
}
