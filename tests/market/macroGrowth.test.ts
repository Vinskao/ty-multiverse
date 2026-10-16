import { describe, it, expect } from 'vitest';
import { MACRO_GROWTH_CHARTS, macroLineMeasure, macroGrowthMode, setMacroGrowthMode } from '../../src/scripts/market/macroGrowth';
import { MACRO_MERGED_CHARTS } from '../../src/scripts/market/macroLayout';

const modes = ['mom', 'yoy'] as const;

describe('MACRO_GROWTH_CHARTS', () => {
    it('only compares month-over-month with month-over-month and year-over-year with year-over-year', () => {
        for (const [id, chart] of Object.entries(MACRO_GROWTH_CHARTS)) {
            for (const mode of modes) {
                expect(chart.lines[mode].length, `${id} ${mode}`).toBeGreaterThan(0);
                for (const line of chart.lines[mode]) expect(macroLineMeasure(line), `${id} ${mode} ${line.code}`).toBe(mode);
            }
        }
    });

    it('shows the same set of indicators in both modes so the toggle swaps like for like', () => {
        for (const chart of Object.values(MACRO_GROWTH_CHARTS)) {
            expect(chart.lines.mom.map((line) => line.label.en)).toEqual(chart.lines.yoy.map((line) => line.label.en));
        }
    });

    it('covers CPI, PPI, retail sales and Taiwan trade', () => {
        expect(Object.keys(MACRO_GROWTH_CHARTS).sort()).toEqual(['cpi', 'ppi', 'retail', 'trade']);
        expect(MACRO_GROWTH_CHARTS.cpi.lines.mom.map((line) => line.code)).toEqual(['CUSR0000SA0', 'CUSR0000SA0L1E', 'TW_CPI']);
        expect(MACRO_GROWTH_CHARTS.cpi.lines.yoy.map((line) => line.code)).toEqual(['CUUR0000SA0', 'CUUR0000SA0L1E', 'TW_CPI']);
        expect(MACRO_GROWTH_CHARTS.trade.group).toBe('fx-trade');
    });

    it('does not also draw growth series in a merged level chart', () => {
        const merged = new Set(Object.values(MACRO_MERGED_CHARTS).flat().flat().flatMap((choice) => choice.split('|')));
        for (const chart of Object.values(MACRO_GROWTH_CHARTS)) {
            for (const mode of modes) for (const line of chart.lines[mode]) expect(merged.has(line.code), line.code).toBe(false);
        }
    });
});

describe('macroLineMeasure', () => {
    it('reads computed growth from the format and published percentages from the code', () => {
        expect(macroLineMeasure({ code: 'RSAFS', format: 'mom' })).toBe('mom');
        expect(macroLineMeasure({ code: 'GBRSLRTTO01GPSAM', format: 'raw' })).toBe('mom');
        expect(macroLineMeasure({ code: 'GBRSLRTTO01GYSAM', format: 'raw' })).toBe('yoy');
        expect(macroLineMeasure({ code: 'DGS10', format: 'raw' })).toBeNull();
    });
});

describe('macroGrowthMode', () => {
    it('starts on year over year and remembers the chosen mode per chart across redraws', () => {
        expect(macroGrowthMode('cpi')).toBe('yoy');
        setMacroGrowthMode('cpi', 'mom');
        expect(macroGrowthMode('cpi')).toBe('mom');
        expect(macroGrowthMode('ppi')).toBe('yoy');
    });
});
