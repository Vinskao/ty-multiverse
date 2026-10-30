import { describe, it, expect } from 'vitest';
import { holdingGroupKey } from '../../src/scripts/market/holdingsGroups';

describe('holding industry grouping', () => {
  it('uses the first available industry and keeps unknowns separate', () => {
    expect(holdingGroupKey([{ id: 'chips' }])).toBe('chips');
    expect(holdingGroupKey([])).toBe('unclassified');
  });
});
