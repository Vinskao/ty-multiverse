export function holdingGroupKey(groups: ReadonlyArray<{ id: string }>): string {
  return groups[0]?.id || 'unclassified';
}
