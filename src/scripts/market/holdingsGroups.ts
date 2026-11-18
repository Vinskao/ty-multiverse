// Which holdings section a row goes in. The AI routine only files stocks into industry groups, so crypto and futures
// without a group get sections of their own instead of waiting forever under 待分類 (2026-11-19).
export type HoldingKind = 'stock' | 'futures' | 'crypto' | undefined;

export function holdingGroupKey(groups: ReadonlyArray<{ id: string }>, productType?: HoldingKind): string {
  if (groups[0]?.id) return groups[0].id;
  if (productType === 'crypto') return 'crypto';
  if (productType === 'futures') return 'futures';
  return 'unclassified';
}

export const HOLDING_KIND_HEADINGS: Record<string, { zh: string; en: string }> = {
  crypto: { zh: '加密貨幣', en: 'Crypto' },
  futures: { zh: '期貨', en: 'Futures' },
};
