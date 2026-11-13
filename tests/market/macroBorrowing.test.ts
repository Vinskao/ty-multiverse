import { describe, expect, it } from 'vitest';
import { MACRO_BORROWING_CHARTS, MACRO_MERGED_CHARTS } from '../../src/scripts/market/macroLayout';
import { MACRO_GROUP_SPECS } from '../../src/scripts/market/macroGroups';

// 2026-11-13: the macro page opens with what borrowing to invest costs in Taiwan, 場內 left and 場外 right.
describe('borrowing-rate charts at the top of the macro page', () => {
  it('puts 場內 on the left and 場外 on the right', () => {
    expect(MACRO_BORROWING_CHARTS.map((chart) => chart.title.zh.slice(0, 2))).toEqual(['場內', '場外']);
  });

  it('keeps each chart to one frequency (daily left, monthly right)', () => {
    expect(MACRO_BORROWING_CHARTS[0].codes).toEqual(['TW_INTERBANK_OVERNIGHT', 'CBC_REDISCOUNT', 'CBC_SECURED_LOAN', 'CBC_SHORT_TERM_LOAN']);
    expect(MACRO_BORROWING_CHARTS[1].codes).toEqual(['TW_CONSUMER_LOAN_RATE', 'TW_WORKING_CAPITAL_LOAN_RATE', 'TW_BANK_LOAN_RATE']);
  });

  it('labels every code in the rates card, which also draws both charts', () => {
    const rates = MACRO_GROUP_SPECS.find((group) => group.id === 'rates')!;
    const labelled = new Set(rates.metrics.map((metric) => metric.code));
    for (const chart of MACRO_BORROWING_CHARTS) {
      for (const code of chart.codes) expect(labelled.has(code)).toBe(true);
      expect(MACRO_MERGED_CHARTS.rates).toContainEqual(chart.codes);
    }
  });
});
