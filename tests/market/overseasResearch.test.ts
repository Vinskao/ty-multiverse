import { describe, it, expect } from 'vitest';
import { overseasDetailTabs, overseasHistoryPoints, secFundamentalsMetrics, overseasFundamentalsPayload, OVERSEAS_PRICE_SOURCE }
    from '../../src/scripts/market/overseasResearch';
import meta from '../fixtures/overseas-meta.json';

// Trimmed production payload of GET /market/dashboard/overseas/META?market=US (IBKR bars + SEC companyfacts).
const financials = meta.datasets.financials.payload;

describe('overseasDetailTabs', () => {
    it('shows price, fundamentals, research and AI analysis; Taiwan-only exchange data tabs stay hidden', () => {
        // Institutional flows, margin/lending and TDCC ownership come from TWSE/TPEx/TDCC; IBKR has no equivalent.
        expect(overseasDetailTabs()).toEqual(['price', 'fundamentals', 'research', 'ai-analysis']);
    });
});

describe('overseasHistoryPoints', () => {
    it('turns persisted IBKR daily bars into OHLCV chart points with share volume', () => {
        const points = overseasHistoryPoints(meta.daily);
        expect(points).toHaveLength(3);
        expect(points[2]).toEqual({ date: '2026-10-15', code: '', name: '', sources: { [OVERSEAS_PRICE_SOURCE]: {
            open: 725.86, high: 743.97, low: 715.58, close: 736.72, volume_shares: 9_699_450 } } });
    });

    it('drops bars with a missing price and keeps a bar whose volume is unknown', () => {
        const points = overseasHistoryPoints([
            { date: '2026-10-14', open: 1, high: 2, low: null, close: 1.5, volume: 10 },
            { date: '2026-10-15', open: 1, high: 2, low: 0.5, close: 1.5, volume: null },
        ]);
        expect(points.map((point) => point.date)).toEqual(['2026-10-15']);
        expect(points[0].sources[OVERSEAS_PRICE_SOURCE]).not.toHaveProperty('volume_shares');
    });
});

describe('secFundamentalsMetrics', () => {
    const metrics = secFundamentalsMetrics(financials);
    const quarter = (period: string) => metrics.quarterly.find((row) => row.period === period)!;

    it('labels single quarters by calendar quarter end and keeps the latest eight', () => {
        expect(metrics.quarterly).toHaveLength(8);
        expect(metrics.quarterly.at(-1)!.period).toBe('2026Q2');
    });

    it('computes revenue, margin and EPS changes against the reported previous quarter and the year-ago quarter', () => {
        const q2 = quarter('2026Q2');
        expect(q2.revenueQoQ).toBeCloseTo((60_801 / 56_311 - 1) * 100, 2);
        expect(q2.revenueYoY).toBeCloseTo((60_801 / 47_516 - 1) * 100, 2);
        expect(q2.grossMargin).toBeCloseTo(81.3654, 3);
        expect(q2.grossMarginYoY).toBeCloseTo(81.3654 - 82.1302, 3);
        expect(q2.epsYoY).toBeCloseTo((6.18 / 7.14 - 1) * 100, 2);
    });

    it('leaves QoQ empty when SEC has no single-quarter fourth-quarter facts (Q4 is never fabricated)', () => {
        const q1 = quarter('2026Q1');
        expect(q1.revenueQoQ).toBeNull();
        expect(q1.revenueYoY).toBeCloseTo((56_311 / 42_314 - 1) * 100, 2);
    });

    it('derives the debt ratio from assets and liabilities; current ratio is not in the SEC set', () => {
        const latest = metrics.balance.at(-1)!;
        expect(latest.period).toBe('2026Q2');
        expect(latest.debtRatio).toBeCloseTo(188_735 / 449_956 * 100, 2);
        expect(latest.debtRatioQoQ).toBeCloseTo(188_735 / 449_956 * 100 - 151_569 / 395_250 * 100, 2);
        expect(latest.debtRatioYoY).toBeCloseTo(188_735 / 449_956 * 100 - 99_674 / 294_744 * 100, 2);
        expect(latest.equityYoY).toBeCloseTo((261_221 / 195_070 - 1) * 100, 2);
        expect(latest.currentRatio).toBeNull();
    });

    it('compares year-to-date cash flow with the same year-to-date period a year earlier', () => {
        const h1 = metrics.cashFlow.at(-1)!;
        expect(h1.period).toBe('2026Q2');
        expect(h1.ocfYoY).toBeCloseTo((64_088 / 49_587 - 1) * 100, 2);
        expect(h1.capexToOcf).toBeCloseTo(49_113 / 64_088 * 100, 2);
        expect(h1.capexToOcfYoY).toBeCloseTo(49_113 / 64_088 * 100 - 29_479 / 49_587 * 100, 2);
        expect(h1.cashConversion).toBeNull();
        // Full-year totals are year-to-date at Q4.
        expect(metrics.cashFlow.find((row) => row.period === '2025Q4')!.ocfYoY).toBeCloseTo((115_800 / 91_328 - 1) * 100, 2);
    });

    it('has no monthly revenue (SEC filers report quarterly)', () => {
        expect(metrics.monthly).toEqual([]);
    });
});

describe('overseasFundamentalsPayload', () => {
    it('wraps US SEC metrics in the Taiwan fundamentals shape with an SEC source line', () => {
        const payload = overseasFundamentalsPayload(meta as any);
        expect(payload.code).toBe('META');
        expect(payload.metrics.quarterly.length).toBe(8);
        expect(payload.source).toContain('SEC EDGAR');
        expect(payload.errors).toEqual([]);
    });

    it('explains where Japan (TDnet) and Korea (OpenDART) filings come from instead of showing empty tables silently', () => {
        const payload = overseasFundamentalsPayload({ code: '6857', market: 'JP', datasets: { financials: null } } as any);
        expect(payload.metrics.quarterly).toEqual([]);
        expect(payload.errors.join(' ')).toMatch(/TDnet/);
        expect(overseasFundamentalsPayload({ code: '000660', market: 'KR', datasets: {} } as any).errors.join(' ')).toMatch(/OpenDART/);
    });

    it('labels Japan TDnet results by their own source, not as SEC 10-Q / 10-K', () => {
        const financials = { source: 'TDnet 決算短信 (Tokyo Stock Exchange timely disclosure)', quarterly: [
            { end: '2026-06-30', revenue: 100, operatingIncome: 20, operatingMarginPercent: 20, epsBasic: 5, epsDiluted: null },
            { end: '2026-09-30', revenue: 160, operatingIncome: 30, operatingMarginPercent: 18.75, epsBasic: null, epsDiluted: null, derivedFromYtd: true },
        ] };
        const payload = overseasFundamentalsPayload({ code: '6857', market: 'JP', datasets: { financials: { payload: financials } } } as any);
        expect(payload.source).toContain('TDnet');
        expect(payload.source).not.toContain('10-Q');
        const [first, second] = payload.metrics.quarterly;
        expect(first.revenueQoQ).toBeNull();
        expect(second.revenueQoQ).toBeCloseTo(60);
    });

    it('uses basic EPS when a filer leaves diluted EPS blank, as Japanese companies without dilution do', () => {
        const rows = [{ end: '2026-03-31', epsBasic: 10, epsDiluted: null }, { end: '2026-06-30', epsBasic: 12, epsDiluted: null }];
        expect(secFundamentalsMetrics({ quarterly: rows }).quarterly[1].epsQoQ).toBeCloseTo(20);
    });
});
