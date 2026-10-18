import { describe, it, expect } from 'vitest';
import { MACRO_GROUP_SPECS } from '../../src/scripts/market/macroGroups';
import { MACRO_MERGED_CHARTS } from '../../src/scripts/market/macroLayout';
import { MACRO_GROWTH_CHARTS } from '../../src/scripts/market/macroGrowth';

const group = (id: string) => MACRO_GROUP_SPECS.find((item) => item.id === id)!;
const codesOf = (id: string) => group(id).metrics.map((metric) => metric.code);

describe('MACRO_GROUP_SPECS', () => {
    it('gives every merged-chart series a tile in the same card (the chart takes its label and format from the tile)', () => {
        for (const [id, charts] of Object.entries(MACRO_MERGED_CHARTS)) {
            const codes = new Set(codesOf(id));
            for (const choice of charts.flat()) for (const code of choice.split('|')) expect(codes.has(code), `${id} ${code}`).toBe(true);
        }
    });

    it('gives every growth-chart line a tile in the card that hosts the chart', () => {
        for (const [chartId, chart] of Object.entries(MACRO_GROWTH_CHARTS)) {
            const codes = new Set(codesOf(chart.group));
            for (const line of [...chart.lines.mom, ...chart.lines.yoy]) expect(codes.has(line.code), `${chartId} ${line.code}`).toBe(true);
        }
    });

    it('never shows a series in two cards', () => {
        const all = MACRO_GROUP_SPECS.flatMap((item) => item.metrics.map((metric) => metric.code));
        expect(new Set(all).size).toBe(all.length);
    });

    it('labels every group and tile in English and Chinese (or through an i18n key)', () => {
        for (const item of [...MACRO_GROUP_SPECS.map((spec) => spec.title), ...MACRO_GROUP_SPECS.flatMap((spec) => spec.metrics.map((metric) => metric.label))]) {
            expect(item.en.length).toBeGreaterThan(0);
            expect('key' in item ? item.key : item.zh).toBeTruthy();
        }
    });

    it('shows money supply for the U.S., euro area, Japan and Taiwan plus central-bank liquidity', () => {
        expect(codesOf('liquidity')).toEqual(expect.arrayContaining(['M2SL', 'EZ_M2_INDEX', 'JP_M2', 'TW_M2', 'TW_M1B',
            'WALCL', 'US_NET_LIQUIDITY', 'WTREGEN', 'RRPONTSYD', 'ECBASSETSW', 'JPNASSETS']));
        // Money stocks are shown as growth; the euro-area index level has no meaning on its own.
        for (const code of ['M2SL', 'EZ_M2_INDEX', 'JP_M2', 'TW_M2', 'TW_M1B']) {
            expect(group('liquidity').metrics.find((metric) => metric.code === code)?.format, code).toBe('yoy');
        }
    });

    it('covers short rates, the yield curve, real yields and other central banks in the rates card', () => {
        expect(codesOf('rates')).toEqual(expect.arrayContaining(['DFEDTARU', 'SOFR', 'DGS3MO', 'DGS2', 'DGS10', 'T10Y2Y', 'T10Y3M',
            'DFII10', 'T10YIE', 'ECBDFR', 'IUDSOIA', 'IRSTCI01JPM156N', 'CBC_REDISCOUNT']));
    });

    it('has a credit and default-risk card with spreads, bank delinquency and charge-offs, and stress indexes', () => {
        expect(codesOf('credit')).toEqual(['BAMLH0A0HYM2', 'BAMLC0A0CM', 'BAA10Y', 'DRALACBS', 'DRBLACBS', 'DRSFRMACBS',
            'DRCCLACBS', 'CORCCACBS', 'STLFSI4', 'NFCI']);
        for (const metric of group('credit').metrics.slice(0, 8)) expect(metric.format, metric.code).toBe('percent');
    });

    it('keeps liquidity and credit right after rates', () => {
        const order = MACRO_GROUP_SPECS.map((item) => item.id);
        expect(order.slice(order.indexOf('rates'), order.indexOf('rates') + 3)).toEqual(['rates', 'liquidity', 'credit']);
    });
});

// The dashboard shows line charts only (no one-number tiles), so every listed indicator must be drawn in a chart.
describe('every macro indicator is charted', () => {
    it('appears in a merged chart or a growth chart of its own card', () => {
        for (const group of MACRO_GROUP_SPECS) {
            const charted = new Set([
                ...(MACRO_MERGED_CHARTS[group.id] || []).flat().flatMap((choice) => choice.split('|')),
                ...Object.values(MACRO_GROWTH_CHARTS).filter((chart) => chart.group === group.id)
                    .flatMap((chart) => [...chart.lines.mom, ...chart.lines.yoy, ...(chart.lines.level || [])].map((line) => line.code)),
            ]);
            for (const metric of group.metrics) expect(charted.has(metric.code), `${group.id} ${metric.code}`).toBe(true);
        }
    });
});
