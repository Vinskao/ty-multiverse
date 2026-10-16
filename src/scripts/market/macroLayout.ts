// Which macro series share a chart, per dashboard card; covered by tests/market/macroLayout.test.ts.

// Related series are compared in one chart: the first code is the base line, the rest are comparison lines with
// every value in one readout (AGENTS.md: one chart per shape). Cards listed here draw their charts below the
// metric tiles instead of one chart per tile. "a|b" means the first code that has data.
export const MACRO_MERGED_CHARTS: Record<string, readonly (readonly string[])[]> = {
    // U.S. and Taiwan unemployment rates (both percent of the labour force) share one chart.
    employment: [['CES0000000001'], ['LNS14000000', 'TW_UNEMPLOYMENT_RATE'], ['ICSA']],
    rates: [['DFEDTARU', 'DFEDTARL'], ['DGS10'], ['CBC_REDISCOUNT', 'CBC_SECURED_LOAN', 'CBC_SHORT_TERM_LOAN']],
    'taiwan-employment': [['TW_EMPLOYED', 'TW_UNEMPLOYED']],
    pmi: [['TW_PMI', 'TW_NMI']],
    // Gold and oil histories in one chart. TPEx publishes only the latest Taiwan spot quote (tile only), so gold's
    // trend comes from COMEX futures, or the World Bank monthly average if COMEX is unavailable.
    commodities: [['COMEX_GOLD_USD|WORLD_GOLD_USD', 'DCOILWTICO']],
    // Exchange rates and Taiwan trade sit in one card: this currency chart, plus the export/import growth chart
    // with its MoM/YoY toggle (macroGrowth.ts, chart "trade").
    'fx-trade': [['CBC_USD_TWD', 'USD_JPY', 'US_DOLLAR_INDEX']],
};

// The unit a series is plotted in: growth formats are percent whatever the level's unit.
function plottedUnit(series: { format: string; unit: string }) {
    if (['mom', 'yoy', 'sales'].includes(series.format) || series.unit === 'percent') return '%';
    if (series.format === 'jobs') return 'persons per month';
    return series.unit;
}

// Series in different plotted units share the date axis but each gets its own colored y-axis (max three),
// so no hand-kept list is needed when a chart is added.
export function macroChartNeedsSeparateAxes(series: ReadonlyArray<{ format: string; unit: string }>) {
    return new Set(series.map(plottedUnit)).size > 1;
}
