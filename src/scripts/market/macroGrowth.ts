// Growth-rate comparison charts with a month-over-month / year-over-year toggle; covered by
// tests/market/macroGrowth.test.ts. Rule: a chart only compares MoM with MoM and YoY with YoY — never both on one axis.
// The money chart also has a level view: each stock indexed to 100 in January 2020 (macroSeries MACRO_REBASE_PERIOD).

export type MacroGrowthMode = 'mom' | 'yoy' | 'level';
export type MacroGrowthLine = { code: string; format: 'mom' | 'yoy' | 'raw' | 'rebased'; label: { en: string; zh: string } };
export type MacroGrowthChart = { group: string; lines: Record<'mom' | 'yoy', MacroGrowthLine[]> & { level?: MacroGrowthLine[] } };

// Series the source already publishes as a growth rate (plotted as-is) and which rate they are.
const PUBLISHED_RATE: Record<string, MacroGrowthMode> = { GBRSLRTTO01GPSAM: 'mom', GBRSLRTTO01GYSAM: 'yoy' };

const headline = { en: 'U.S. headline CPI', zh: '美國整體 CPI' };
const core = { en: 'U.S. core CPI', zh: '美國核心 CPI' };
const twCpi = { en: 'Taiwan CPI', zh: '台灣 CPI' };
const usPpi = { en: 'U.S. PPI · final demand', zh: '美國 PPI · 最終需求' };
const twPpi = { en: 'Taiwan PPI', zh: '台灣 PPI' };
const usRetail = { en: 'U.S. retail sales', zh: '美國零售銷售' };
const ukRetail = { en: 'UK retail sales volume', zh: '英國零售銷售量' };
const exports = { en: 'Exports', zh: '出口總值' };
const imports = { en: 'Imports', zh: '進口總值' };
const usM2 = { en: 'U.S. M2', zh: '美國 M2' };
const ezM2 = { en: 'Euro area M2', zh: '歐元區 M2' };
const jpM2 = { en: 'Japan M2', zh: '日本 M2' };
const twM2 = { en: 'Taiwan M2', zh: '台灣 M2' };
const twM1b = { en: 'Taiwan M1B', zh: '台灣 M1B' };
const money = (format: 'mom' | 'yoy' | 'rebased'): MacroGrowthLine[] => [
    { code: 'M2SL', format, label: usM2 }, { code: 'EZ_M2_INDEX', format, label: ezM2 }, { code: 'JP_M2', format, label: jpM2 },
    { code: 'TW_M2', format, label: twM2 }, { code: 'TW_M1B', format, label: twM1b }];

// Monthly CPI changes use the seasonally adjusted index (as BLS headlines do); annual changes use the
// unadjusted index, which also carries the Michigan expectation and the release consensus. DGBAS publishes Taiwan's
// headline CPI unadjusted, so its monthly line is a raw month-over-month change.
export const MACRO_GROWTH_CHARTS: Record<string, MacroGrowthChart> = {
    cpi: { group: 'inflation', lines: {
        mom: [{ code: 'CUSR0000SA0', format: 'mom', label: headline }, { code: 'CUSR0000SA0L1E', format: 'mom', label: core }, { code: 'TW_CPI', format: 'mom', label: twCpi }],
        yoy: [{ code: 'CUUR0000SA0', format: 'yoy', label: headline }, { code: 'CUUR0000SA0L1E', format: 'yoy', label: core }, { code: 'TW_CPI', format: 'yoy', label: twCpi }],
    } },
    ppi: { group: 'inflation', lines: {
        mom: [{ code: 'WPUFD4', format: 'mom', label: usPpi }, { code: 'TW_PPI', format: 'mom', label: twPpi }],
        yoy: [{ code: 'WPUFD4', format: 'yoy', label: usPpi }, { code: 'TW_PPI', format: 'yoy', label: twPpi }],
    } },
    retail: { group: 'consumption', lines: {
        mom: [{ code: 'RSAFS', format: 'mom', label: usRetail }, { code: 'GBRSLRTTO01GPSAM', format: 'raw', label: ukRetail }],
        yoy: [{ code: 'RSAFS', format: 'yoy', label: usRetail }, { code: 'GBRSLRTTO01GYSAM', format: 'raw', label: ukRetail }],
    } },
    // Money stocks in four currencies share an axis as growth rates, or as levels indexed to January 2020 (the
    // readout shows each amount). The euro-area line is the ECB index of notional stocks, whose growth matches the
    // ECB's published rate (it excludes reclassifications); it has no amount.
    money: { group: 'liquidity', lines: { level: money('rebased'), yoy: money('yoy'), mom: money('mom') } },
    trade: { group: 'fx-trade', lines: {
        mom: [{ code: 'TW_EXPORTS', format: 'mom', label: exports }, { code: 'TW_IMPORTS', format: 'mom', label: imports }],
        yoy: [{ code: 'TW_EXPORTS', format: 'yoy', label: exports }, { code: 'TW_IMPORTS', format: 'yoy', label: imports }],
    } },
};

// Which growth rate a line shows: computed lines from their format, published rates from their code.
export function macroLineMeasure(line: { code: string; format: string }): MacroGrowthMode | null {
    if (line.format === 'mom' || line.format === 'yoy') return line.format;
    return PUBLISHED_RATE[line.code] ?? null;
}

// Toggle buttons in order: the level view first where a chart has one.
export function macroGrowthModes(chartId: string): MacroGrowthMode[] {
    return MACRO_GROWTH_CHARTS[chartId]?.lines.level ? ['level', 'yoy', 'mom'] : ['mom', 'yoy'];
}

// Money stocks as trillions of their own currency for the level readout (units as maya-sawa stores them).
const MONEY_STOCK_UNITS: Record<string, { currency: string; perTrillion: number }> = {
    M2SL: { currency: 'USD', perTrillion: 1_000 }, JP_M2: { currency: 'JPY', perTrillion: 1 },
    TW_M2: { currency: 'TWD', perTrillion: 1_000_000 }, TW_M1B: { currency: 'TWD', perTrillion: 1_000_000 },
};
export function macroMoneyStock(code: string, value: number) {
    const unit = MONEY_STOCK_UNITS[code];
    return unit ? { currency: unit.currency, trillions: value / unit.perTrillion } : null;
}

// The chosen mode survives the dashboard's periodic redraws. Default: the level view where a chart has one,
// else year over year (less noisy than month over month).
const chosenModes = new Map<string, MacroGrowthMode>();
export function macroGrowthMode(chartId: string): MacroGrowthMode {
    return chosenModes.get(chartId) ?? (MACRO_GROWTH_CHARTS[chartId]?.lines.level ? 'level' : 'yoy');
}
export function setMacroGrowthMode(chartId: string, mode: MacroGrowthMode) {
    chosenModes.set(chartId, mode);
}
