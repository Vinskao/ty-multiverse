import { describe, it, expect } from 'vitest';
import { holdingGroupKey } from '../../src/scripts/market/holdingsGroups';

describe('holding industry grouping', () => {
  it('uses the first available industry and keeps unknowns separate', () => {
    expect(holdingGroupKey([{ id: 'chips' }])).toBe('chips');
    expect(holdingGroupKey([])).toBe('unclassified');
  });
});

describe('crypto and futures sections', () => {
    it('keeps crypto and ungrouped futures out of 待分類, but a futures group still wins', () => {
        expect(holdingGroupKey([], 'crypto')).toBe('crypto');
        expect(holdingGroupKey([], 'futures')).toBe('futures');
        expect(holdingGroupKey([], 'stock')).toBe('unclassified');
        expect(holdingGroupKey([{ id: 'ic-design' }], 'futures')).toBe('ic-design');
    });
});
