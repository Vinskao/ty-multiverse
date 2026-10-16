// Growth-rate comparison charts with a month-over-month / year-over-year toggle; covered by
// tests/market/macroGrowth.test.ts. Rule: a chart only compares MoM with MoM and YoY with YoY — never both on one axis.

export type MacroGrowthMode = 'mom' | 'yoy';
export type MacroGrowthLine = { code: string; format: 'mom' | 'yoy' | 'raw'; label: { en: string; zh: string } };
export type MacroGrowthChart = { group: string; lines: Record<MacroGrowthMode, MacroGrowthLine[]> };

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

// The chosen mode survives the dashboard's periodic redraws; year over year is the default (less noisy).
const chosenModes = new Map<string, MacroGrowthMode>();
export function macroGrowthMode(chartId: string): MacroGrowthMode {
    return chosenModes.get(chartId) ?? 'yoy';
}
export function setMacroGrowthMode(chartId: string, mode: MacroGrowthMode) {
    chosenModes.set(chartId, mode);
}
