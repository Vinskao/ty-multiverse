import { describe, it, expect } from 'vitest';
import { MACRO_MERGED_CHARTS, macroChartNeedsSeparateAxes, macroChartTitle } from '../../src/scripts/market/macroLayout';
import { MACRO_GROWTH_CHARTS } from '../../src/scripts/market/macroGrowth';
import i18n from '../../src/storages/i18n.json';

const chartCodes = (charts: readonly (readonly string[])[]) => charts.flat().flatMap((choice) => choice.split('|'));

describe('macro chart layout', () => {
    it('shows exchange rates and Taiwan trade in the same card', () => {
        const card = MACRO_MERGED_CHARTS['fx-trade'];
        expect(card).toBeDefined();
        expect(card[0]).toEqual(['CBC_USD_TWD', 'USD_JPY', 'US_DOLLAR_INDEX']);
        expect(card).toHaveLength(2);
        expect(card[1]).toEqual(['DEXKOUS']);
        expect(MACRO_GROWTH_CHARTS.trade.group).toBe('fx-trade');
        expect(MACRO_MERGED_CHARTS['taiwan-fx']).toBeUndefined();
        expect(MACRO_MERGED_CHARTS['taiwan-trade']).toBeUndefined();
    });

    it('compares the U.S. and Taiwan unemployment rates in one chart', () => {
        expect(MACRO_MERGED_CHARTS.employment).toEqual([['CES0000000001'], ['LNS14000000', 'TW_UNEMPLOYMENT_RATE', 'LRUNTTTTJPM156S', 'LRUNTTTTKRM156S'], ['ICSA']]);
    });

    it('titles the dashboard as multi-country, not U.S.-only', () => {
        const title = i18n.home.macroTitle;
        expect(title.zh).not.toMatch(/^美國/);
        expect(title.en).not.toMatch(/^US /);
        expect(title.zh).toBe('多國重要總體經濟資料');
    });

    it('compares commodity price histories in one chart', () => {
        expect(MACRO_MERGED_CHARTS.commodities).toEqual([['COMEX_GOLD_USD|WORLD_GOLD_USD', 'DCOILWTICO']]);
    });

    it('splits rates into policy, yield-curve, spread, real-yield and foreign-central-bank charts', () => {
        expect(MACRO_MERGED_CHARTS.rates).toEqual([
            ['DFEDTARU', 'DFEDTARL', 'SOFR'], ['DGS3MO', 'DGS2', 'DGS10'], ['T10Y2Y', 'T10Y3M'], ['DFII10', 'T10YIE'],
            ['ECBDFR', 'IUDSOIA'], ['IRSTCI01JPM156N', 'IRSTCI01KRM156N'], ['CBC_REDISCOUNT', 'CBC_SECURED_LOAN', 'CBC_SHORT_TERM_LOAN']]);
    });

    it('splits the Fed balance sheet from its drains and keeps weekly and monthly balance sheets in separate charts', () => {
        // Total assets (~6,800B) on one axis with ON RRP (~0B) flattened every line; the drains get their own scale.
        // Weekly (YYYY-MM-DD) and monthly (YYYY-MM) periods on one date axis would interleave out of order.
        expect(MACRO_MERGED_CHARTS.liquidity).toEqual([['WALCL', 'US_NET_LIQUIDITY'], ['WTREGEN', 'RRPONTSYD'], ['ECBASSETSW'], ['JPNASSETS']]);
        expect(macroChartNeedsSeparateAxes(['WTREGEN', 'RRPONTSYD'].map(() => ({ format: 'raw', unit: 'USD billion' })))).toBe(false);
    });

    it('groups credit spreads, quarterly bank delinquency and weekly stress indexes in their own charts', () => {
        expect(MACRO_MERGED_CHARTS.credit).toEqual([
            ['BAMLH0A0HYM2', 'BAMLC0A0CM', 'BAA10Y'],
            ['DRALACBS', 'DRBLACBS', 'DRSFRMACBS', 'DRCCLACBS', 'CORCCACBS'],
            ['STLFSI4', 'NFCI']]);
    });

    // 2026-10-29: the owner wants Taiwan's margin maintenance ratio and VIX in one chart, each on its own y-axis.
    it('draws margin balance, turnover and VIX in one chart and the maintenance ratio in its own', () => {
        // 2026-10-29: margin balance, market turnover and VIX read together as one indicator; the ratio keeps its own chart.
        expect(MACRO_MERGED_CHARTS['market-risk']).toEqual([['TW_MARGIN_BALANCE', 'TW_MARKET_TURNOVER', 'US_VIX'], ['TW_MARGIN_MAINTENANCE']]);
        expect(macroChartNeedsSeparateAxes([{ format: 'percent', unit: 'percent' }, { format: 'raw', unit: 'index points' }])).toBe(true);
    });

    it('never draws a series in two charts and keeps multi-line charts to the three-axis maximum when units differ', () => {
        const all = Object.values(MACRO_MERGED_CHARTS).flatMap(chartCodes);
        expect(new Set(all).size).toBe(all.length);
    });
});

describe('macroChartNeedsSeparateAxes', () => {
    it('splits axes when the series have different units', () => {
        expect(macroChartNeedsSeparateAxes([{ format: 'raw', unit: 'TWD/USD' }, { format: 'raw', unit: 'JPY/USD' }, { format: 'raw', unit: 'index points' }])).toBe(true);
        expect(macroChartNeedsSeparateAxes([{ format: 'raw', unit: 'USD/troy oz' }, { format: 'raw', unit: 'USD/barrel' }])).toBe(true);
    });

    it('keeps one axis for the same unit, including growth rates computed from different levels', () => {
        expect(macroChartNeedsSeparateAxes([{ format: 'percent', unit: 'percent' }, { format: 'percent', unit: 'percent' }])).toBe(false);
        expect(macroChartNeedsSeparateAxes([{ format: 'yoy', unit: 'NTD thousand' }, { format: 'yoy', unit: 'NTD thousand' }])).toBe(false);
        expect(macroChartNeedsSeparateAxes([{ format: 'mom', unit: 'index 1982-84=100' }, { format: 'yoy', unit: 'index 1982-84=100' }])).toBe(false);
        expect(macroChartNeedsSeparateAxes([{ format: 'jobs', unit: 'thousand persons' }, { format: 'jobs', unit: 'thousand persons' }])).toBe(false);
        expect(macroChartNeedsSeparateAxes([{ format: 'raw', unit: 'USD/troy oz' }])).toBe(false);
    });

    it('treats a percent-unit level and a percent growth rate as the same axis', () => {
        expect(macroChartNeedsSeparateAxes([{ format: 'sales', unit: 'millions of dollars' }, { format: 'raw', unit: 'percent' }])).toBe(false);
    });
});

describe('macroChartTitle', () => {
    it('names a one-series chart after its series', () => {
        expect(macroChartTitle(['Nonfarm payrolls'])).toBe('Nonfarm payrolls');
    });

    it('names a comparison chart after every series it draws, once each', () => {
        expect(macroChartTitle(['Unemployment rate', 'Taiwan unemployment rate'])).toBe('Unemployment rate vs Taiwan unemployment rate');
        expect(macroChartTitle(['Fed target · upper', 'Fed target · lower', 'SOFR', 'SOFR'])).toBe('Fed target · upper / Fed target · lower / SOFR');
    });

    it('ignores blank labels', () => {
        expect(macroChartTitle(['', ' ', 'ICSA'])).toBe('ICSA');
    });
});
