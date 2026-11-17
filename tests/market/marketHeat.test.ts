import { expect, it } from 'vitest';
import { marketHeat } from '../../src/scripts/market/marketHeat';
it('reports the observed losing streak', () => {
 expect(marketHeat([110,109,108,107,106,105,104,103,102,101,100])).toContain('連跌 10');
 expect(marketHeat([100,94])).toContain('急跌');
 expect(marketHeat([100,101])).toBe('');
});
