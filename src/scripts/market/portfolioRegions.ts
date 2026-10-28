// Region split line under the portfolio totals (台 · 外 · 幣); covered by tests/market/portfolioRegions.test.ts.
import type { RegionFigures } from '../../types/portfolio';

type Regions = { taiwan: RegionFigures; overseas: RegionFigures; total: RegionFigures; crypto?: RegionFigures };
type Field = 'cash' | 'totalAssets';

export function hasOverseasRegion(regions: Regions | undefined): boolean {
    return !!regions && ((regions.overseas.totalAssets ?? 0) !== 0 || (regions.overseas.cash ?? 0) !== 0);
}

// Crypto has no cash figure (stablecoins are not bank cash), so it only joins the total-assets line.
export function regionSplit(regions: Regions | undefined, field: Field, language: 'en' | 'zh', format: (value: number | null) => string): string | null {
    if (!regions) return null;
    const label = (en: string, zh: string) => language === 'zh' ? zh : en;
    const parts = [`${label('TW', '台')} ${format(regions.taiwan[field])}`];
    if (hasOverseasRegion(regions)) parts.push(`${label('Overseas', '外')} ${format(regions.overseas[field])}`);
    const crypto = regions.crypto?.[field];
    if (crypto !== null && crypto !== undefined && crypto !== 0) parts.push(`${label('Crypto', '幣')} ${format(crypto)}`);
    return parts.length > 1 ? parts.join(' · ') : null;
}
