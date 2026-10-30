import { describe, expect, it } from 'vitest';
import { prioritizeMacroGroups } from '../../src/scripts/market/macroCountry';
import { MACRO_GROUP_SPECS } from '../../src/scripts/market/macroGroups';

describe('macro economy priority', () => {
  it('brings matching groups forward without dropping or rearranging peers, and restores the default', () => {
    const groups = MACRO_GROUP_SPECS;
    const prioritized = prioritizeMacroGroups(groups, 'uk');
    expect(prioritized[0].id).toBe('rates');
    expect(prioritized[1].id).toBe('consumption');
    expect(new Set(prioritized.map(g => g.id))).toEqual(new Set(groups.map(g => g.id)));
    expect(prioritizeMacroGroups(groups, null)).toEqual(groups);
  });
  it('recognizes Taiwan and US even when a label is implicit', () => {
    expect(prioritizeMacroGroups(MACRO_GROUP_SPECS, 'tw').some(g => g.id === 'pmi')).toBe(true);
    expect(prioritizeMacroGroups(MACRO_GROUP_SPECS, 'us')[0].id).toBe('employment');
  });
});
