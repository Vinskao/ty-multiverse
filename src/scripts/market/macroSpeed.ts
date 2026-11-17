// 2026-11-17: the macro page opens with fast variables (markets that reprice daily or weekly) and ends with slow ones
// (labour, prices, forecasts, demographics); covered by tests/market/macroSpeed.test.ts.
export type MacroSpeed = 'fast' | 'slow';

const FAST_GROUPS = new Set(['rates', 'credit', 'commodities', 'market-risk', 'fx-trade', 'liquidity']);

export const macroSpeedOf = (groupId: string): MacroSpeed => (FAST_GROUPS.has(groupId) ? 'fast' : 'slow');

/** Splits cards into the two sections, keeping the incoming order (the country filter's) inside each. */
export function splitMacroBySpeed<T extends { id: string }>(groups: readonly T[]): { fast: T[]; slow: T[] } {
    return { fast: groups.filter((group) => macroSpeedOf(group.id) === 'fast'), slow: groups.filter((group) => macroSpeedOf(group.id) === 'slow') };
}

export const MACRO_SPEED_HEADINGS: Record<MacroSpeed, { zh: string; en: string; noteZh: string; noteEn: string }> = {
    fast: { zh: '快變量', en: 'Fast variables', noteZh: '市場每天或每週重新定價：利率、信用、匯率、商品、流動性與風險情緒。',
        noteEn: 'Priced by markets every day or week: rates, credit, currencies, commodities, liquidity and risk sentiment.' },
    slow: { zh: '慢變量', en: 'Slow variables', noteZh: '按月、季、年才變：就業、物價、消費、景氣預測與人口。',
        noteEn: 'Move by the month, quarter or year: jobs, prices, consumption, forecasts and population.' },
};

/** Population series are yearly levels in millions of persons. */
export const isMacroPopulationCode = (code: string) => /^(US|JP|TW|KR)_POPULATION$/.test(code);
