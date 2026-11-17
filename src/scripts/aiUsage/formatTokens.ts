import { formatNumber } from '../format/numbers';

export function formatTokens(n: number): string {
  if (n >= 1_000_000_000) return `${formatNumber(Math.round(n / 10_000_000) / 100, 'decimal', { digits: 2 }).replace(/\.?0+$/, '')}B`;
  if (n >= 1_000_000) return `${Math.round(n / 1_000_000)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(Math.round(n));
}

