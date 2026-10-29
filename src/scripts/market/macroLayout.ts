// Which macro series share a chart, per dashboard card; covered by tests/market/macroLayout.test.ts.

// Related series are compared in one chart: the first code is the base line, the rest are comparison lines with
// every value in one readout (AGENTS.md: one chart per shape). Cards listed here draw their charts below the
// metric tiles instead of one chart per tile. "a|b" means the first code that has data.
export const MACRO_MERGED_CHARTS: Record<string, readonly (readonly string[])[]> = {
    // U.S. and Taiwan unemployment rates (both percent of the labour force) share one chart.
    employment: [['CES0000000001'], ['LNS14000000', 'TW_UNEMPLOYMENT_RATE', 'LRUNTTTTJPM156S', 'LRUNTTTTKRM156S'], ['ICSA']],
    // Daily series only share a chart with daily series: monthly (YYYY-MM) periods would interleave out of order
    // with dates, so Japan's monthly call rate and the BoJ balance sheet get their own charts.
    rates: [['DFEDTARU', 'DFEDTARL', 'SOFR'], ['DGS3MO', 'DGS2', 'DGS10'], ['T10Y2Y', 'T10Y3M'], ['DFII10', 'T10YIE'],
        ['ECBDFR', 'IUDSOIA'], ['IRSTCI01JPM156N', 'IRSTCI01KRM156N'], ['CBC_REDISCOUNT', 'CBC_SECURED_LOAN', 'CBC_SHORT_TERM_LOAN']],
    // Fed total assets with net liquidity, then the two drains (TGA, ON RRP) on their own scale: on one axis the
    // ~6,800B balance sheet flattened a 0-2,500B reverse repo. Money supply is the "money" growth chart.
    liquidity: [['WALCL', 'US_NET_LIQUIDITY'], ['WTREGEN', 'RRPONTSYD'], ['ECBASSETSW'], ['JPNASSETS']],
    credit: [['BAMLH0A0HYM2', 'BAMLC0A0CM', 'BAA10Y'], ['DRALACBS', 'DRBLACBS', 'DRSFRMACBS', 'DRCCLACBS', 'CORCCACBS'], ['STLFSI4', 'NFCI']],
    'taiwan-employment': [['TW_EMPLOYED', 'TW_UNEMPLOYED']],
    pmi: [['TW_PMI', 'TW_NMI']],
    // Gold and oil histories in one chart. TPEx publishes only the latest Taiwan spot quote (tile only), so gold's
    // trend comes from COMEX futures, or the World Bank monthly average if COMEX is unavailable.
    commodities: [['COMEX_GOLD_USD|WORLD_GOLD_USD', 'DCOILWTICO']],
    // Exchange rates and Taiwan trade sit in one card: this currency chart, plus the export/import growth chart
    // with its MoM/YoY toggle (macroGrowth.ts, chart "trade").
    'fx-trade': [['CBC_USD_TWD', 'USD_JPY', 'US_DOLLAR_INDEX'], ['DEXKOUS']],
    // Both daily; percent and index points, so each gets its own y-axis (left: maintenance ratio, right: VIX).
    'market-risk': [['TW_MARGIN_MAINTENANCE', 'US_VIX']],
};

// The unit a series is plotted in: growth formats are percent whatever the level's unit.
function plottedUnit(series: { format: string; unit: string }) {
    if (['mom', 'yoy', 'sales'].includes(series.format) || series.unit === 'percent') return '%';
    if (series.format === 'rebased') return 'index';
    if (series.format === 'jobs') return 'persons per month';
    return series.unit;
}

// Series in different plotted units share the date axis but each gets its own colored y-axis (max three),
// so no hand-kept list is needed when a chart is added.
export function macroChartNeedsSeparateAxes(series: ReadonlyArray<{ format: string; unit: string }>) {
    return new Set(series.map(plottedUnit)).size > 1;
}

// Every chart carries a visible title naming what it draws: one series by its name, two as "A vs B", more as a list.
export function macroChartTitle(labels: readonly string[]): string {
    const names = [...new Set(labels.map((label) => label.trim()).filter(Boolean))];
    return names.join(names.length === 2 ? ' vs ' : ' / ');
}
