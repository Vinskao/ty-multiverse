import { describe, expect, it } from 'vitest';
import { MACRO_GROUP_SPECS } from '../../src/scripts/market/macroGroups';
import { MACRO_MERGED_CHARTS } from '../../src/scripts/market/macroLayout';
import { macroSpeedOf, splitMacroBySpeed } from '../../src/scripts/market/macroSpeed';

// 2026-11-17: the macro page separates fast variables (markets that move daily) from slow ones (labour, prices, demographics).
describe('fast and slow macro variables', () => {
  it('classifies every card, so a new card cannot be left without a section', () => {
    for (const group of MACRO_GROUP_SPECS) expect(['fast', 'slow'], group.id).toContain(macroSpeedOf(group.id));
  });

  it('puts market-priced cards in fast and labour, prices, forecasts and population in slow', () => {
    for (const id of ['rates', 'credit', 'commodities', 'market-risk', 'fx-trade', 'liquidity']) expect(macroSpeedOf(id), id).toBe('fast');
    for (const id of ['employment', 'inflation', 'taiwan-employment', 'consumption', 'pmi', 'tw-forecast', 'population']) expect(macroSpeedOf(id), id).toBe('slow');
  });

  it('lists fast cards first and keeps the incoming (country) order inside each section', () => {
    const order = ['employment', 'rates', 'population', 'credit'].map((id) => ({ id }));
    const { fast, slow } = splitMacroBySpeed(order);
    expect(fast.map((g) => g.id)).toEqual(['rates', 'credit']);
    expect(slow.map((g) => g.id)).toEqual(['employment', 'population']);
  });
});

describe('population card', () => {
  const group = MACRO_GROUP_SPECS.find((item) => item.id === 'population')!;
  it('tracks the U.S., Japan, Taiwan and Korea', () => {
    expect(group.metrics.map((metric) => metric.code)).toEqual(['US_POPULATION', 'JP_POPULATION', 'TW_POPULATION', 'KR_POPULATION']);
  });
  it('draws the four countries in one chart', () => {
    expect(MACRO_MERGED_CHARTS.population).toEqual([['US_POPULATION', 'JP_POPULATION', 'TW_POPULATION', 'KR_POPULATION']]);
  });
});

describe('population readout', () => {
  it('recognises only the four yearly population series', async () => {
    const { isMacroPopulationCode } = await import('../../src/scripts/market/macroSpeed');
    expect(['US_POPULATION', 'JP_POPULATION', 'TW_POPULATION', 'KR_POPULATION'].every(isMacroPopulationCode)).toBe(true);
    expect(isMacroPopulationCode('TW_M2')).toBe(false);
  });
});
