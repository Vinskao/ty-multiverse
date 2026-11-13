import { describe, expect, it } from 'vitest';
import { stockDeepLink } from '../../src/scripts/market/stockDeepLink';

describe('stock deep link from nav bar search', () => {
  it('reads the stock and a known tab', () => {
    expect(stockDeepLink('?stock=3167&tab=research')).toEqual({ code: '3167', name: '3167', tab: 'research' });
    expect(stockDeepLink('?stock=3167&tab=bogus')).toEqual({ code: '3167', name: '3167', tab: null });
    expect(stockDeepLink('?q=x')).toBeNull();
  });
});
