import { describe, it, expect } from 'vitest';
import { FUNDAMENTAL_CHARTS, fundamentalChartLines } from '../../src/scripts/market/fundamentalsCharts';
import { secFundamentalsMetrics } from '../../src/scripts/market/overseasResearch';

// Nanya (2408) 2026Q2 as computed by maya-sawa from FinMind (tests/test_market_fundamentals.py in maya-sawa).
const nanya = [
    { period: '2025Q2', inventoryDays: 255.47, inventoryYoY: 12.4, inventoryVsRevenueYoY: 5.1, debtRatio: 22.1, currentRatio: 310.2 },
    { period: '2026Q2', inventoryDays: 116.03, inventoryYoY: -39.4, inventoryVsRevenueYoY: -723.62, debtRatio: 20.1, currentRatio: 402.5 },
];

describe('FUNDAMENTAL_CHARTS', () => {
    it('groups every statement into line charts, with inventory right after margins', () => {
        expect(FUNDAMENTAL_CHARTS.map((chart) => chart.id)).toEqual(['growth', 'margins', 'inventory-days', 'inventory-growth', 'structure', 'cash']);
        expect(FUNDAMENTAL_CHARTS.find((chart) => chart.id === 'inventory-days')!.lines.map((line) => line.key)).toEqual(['inventoryDays']);
        expect(FUNDAMENTAL_CHARTS.find((chart) => chart.id === 'inventory-growth')!.lines.map((line) => line.key))
            .toEqual(['inventoryYoY', 'inventoryVsRevenueYoY']);
    });

    it('keeps one unit per chart (days never share an axis with percent)', () => {
        for (const chart of FUNDAMENTAL_CHARTS) expect(new Set(chart.lines.map((line) => line.unit)).size, chart.id).toBe(1);
    });
});

describe('fundamentalChartLines', () => {
    it('keeps only lines that have at least one number', () => {
        const structure = FUNDAMENTAL_CHARTS.find((chart) => chart.id === 'structure')!;
        expect(fundamentalChartLines(structure, nanya).map((line) => line.key)).toEqual(['debtRatio', 'currentRatio']);
        expect(fundamentalChartLines(structure, [{ period: '2026Q2', debtRatio: 41.9, currentRatio: null }]).map((line) => line.key)).toEqual(['debtRatio']);
        expect(fundamentalChartLines(FUNDAMENTAL_CHARTS.find((chart) => chart.id === 'inventory-days')!, [{ period: '2026Q2', inventoryDays: null }])).toEqual([]);
    });
});

describe('SEC inventory metrics', () => {
    it('derives days of inventory and inventory growth from InventoryNet and quarterly cost of revenue', () => {
        const metrics = secFundamentalsMetrics({
            quarterly: [
                { start: '2025-03-30', end: '2025-06-28', durationDays: 90, revenue: 400, costOfRevenue: 250 },
                { start: '2025-12-28', end: '2026-03-28', durationDays: 90, revenue: 800, costOfRevenue: 450 },
                { start: '2026-03-29', end: '2026-06-27', durationDays: 90, revenue: 1000, costOfRevenue: 560 },
            ],
            balanceSheet: [
                { end: '2025-06-28', assets: 1000, liabilities: 400, inventory: 300 },
                { end: '2026-03-28', assets: 1200, liabilities: 500, inventory: 360 },
                { end: '2026-06-27', assets: 1300, liabilities: 520, inventory: 420 },
            ],
        });
        const q2 = metrics.balance.at(-1)!;
        expect(q2.inventoryDays).toBeCloseTo(420 / 560 * 91.25, 4);
        expect(q2.inventoryDaysYoY).toBeCloseTo(420 / 560 * 91.25 - 300 / 250 * 91.25, 4);
        expect(q2.inventoryQoQ).toBeCloseTo((420 / 360 - 1) * 100, 4);
        expect(q2.inventoryYoY).toBeCloseTo((420 / 300 - 1) * 100, 4);
        expect(q2.inventoryVsRevenueYoY).toBeCloseTo((420 / 300 - 1) * 100 - (1000 / 400 - 1) * 100, 4);
    });
});

describe('fundamentals chart titles', () => {
    it('gives the monthly revenue chart and every statement chart its own bilingual title', async () => {
        const { REVENUE_CHART_TITLE } = await import('../../src/scripts/market/fundamentalsCharts');
        for (const title of [REVENUE_CHART_TITLE, ...FUNDAMENTAL_CHARTS.map((chart) => chart.title)]) {
            expect(title.en.trim()).not.toBe('');
            expect(title.zh.trim()).not.toBe('');
        }
        expect(REVENUE_CHART_TITLE.zh).toContain('月營收');
    });
});
