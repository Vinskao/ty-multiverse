// Fundamentals tab: every statement metric is a line chart, grouped by what it answers (no tables);
// covered by tests/market/fundamentalsCharts.test.ts. Rows come from maya-sawa metrics (Taiwan) or
// secFundamentalsMetrics (US); index.ts only draws them.

export type FundamentalUnit = 'percent' | 'growth' | 'days';
export type FundamentalLine = { key: string; label: { en: string; zh: string }; color: string; unit: FundamentalUnit };
export type FundamentalChart = { id: string; source: 'quarterly' | 'balance' | 'cashFlow'; title: { en: string; zh: string }; note?: { en: string; zh: string }; lines: FundamentalLine[] };

const line = (key: string, en: string, zh: string, color: string, unit: FundamentalUnit): FundamentalLine => ({ key, label: { en, zh }, color, unit });

export const FUNDAMENTAL_CHARTS: readonly FundamentalChart[] = [
    { id: 'growth', source: 'quarterly', title: { en: 'Growth · single quarter', zh: '成長 · 單季' }, lines: [
        line('revenueYoY', 'Revenue YoY', '營收年增', '#55b8a8', 'growth'),
        line('revenueQoQ', 'Revenue QoQ', '營收季增', '#7198df', 'growth'),
        line('epsYoY', 'EPS YoY', 'EPS 年增', '#d5ae4b', 'growth'),
        line('epsQoQ', 'EPS QoQ', 'EPS 季增', '#d98ff5', 'growth'),
    ] },
    { id: 'margins', source: 'quarterly', title: { en: 'Margins · single quarter', zh: '三率 · 單季' }, lines: [
        line('grossMargin', 'Gross margin', '毛利率', '#55b8a8', 'percent'),
        line('operatingMargin', 'Operating margin', '營業利益率', '#7198df', 'percent'),
        line('netMargin', 'Net margin', '淨利率', '#d5ae4b', 'percent'),
    ] },
    // Inventory is the earliest warning of a cycle turn: rising days or inventory growing faster than sales.
    { id: 'inventory-days', source: 'balance', title: { en: 'Days of inventory', zh: '庫存天數' },
        note: { en: 'Quarter-end inventory ÷ single-quarter cost of goods sold × 91.25 days.', zh: '季末存貨 ÷ 單季銷貨成本 × 91.25 天。' }, lines: [
            line('inventoryDays', 'Days of inventory', '庫存天數', '#f08e82', 'days'),
        ] },
    { id: 'inventory-growth', source: 'balance', title: { en: 'Inventory vs. revenue', zh: '庫存 vs 營收' },
        note: { en: 'Above 0: inventory grows faster than sales (building stock); below 0: destocking.', zh: '大於 0：庫存成長快於營收（堆庫存）；小於 0：去化。' }, lines: [
            line('inventoryYoY', 'Inventory YoY', '庫存年增', '#f08e82', 'growth'),
            line('inventoryVsRevenueYoY', 'Inventory YoY − revenue YoY', '庫存年增 − 營收年增', '#7198df', 'growth'),
        ] },
    { id: 'structure', source: 'balance', title: { en: 'Financial structure', zh: '財務結構' }, lines: [
        line('debtRatio', 'Debt ratio', '負債比', '#d5ae4b', 'percent'),
        line('currentRatio', 'Current ratio', '流動比', '#55b8a8', 'percent'),
    ] },
    { id: 'cash', source: 'cashFlow', title: { en: 'Cash flow · year to date', zh: '現金流 · 年初至今' },
        note: { en: 'Year-to-date statements; growth compares with the same period last year.', zh: '現金流量表為累計數，年增比較去年同期。' }, lines: [
            line('cashConversion', 'Operating cash flow ÷ pre-tax income', '營業現金流 ÷ 稅前淨利', '#55b8a8', 'percent'),
            line('capexToOcf', 'Capex ÷ operating cash flow', '資本支出 ÷ 營業現金流', '#d5ae4b', 'percent'),
        ] },
];

// Lines with at least one number; a chart with none is skipped instead of drawing an empty axis.
export function fundamentalChartLines(chart: FundamentalChart, rows: ReadonlyArray<Record<string, unknown>>) {
    return chart.lines.filter((item) => rows.some((row) => typeof row[item.key] === 'number' && Number.isFinite(row[item.key] as number)));
}
