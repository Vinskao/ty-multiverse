import { describe, expect, it } from 'vitest';
import { formatTokens } from '../../src/scripts/aiUsage/formatTokens';

describe('formatTokens', () => {
  it('formats billion-scale usage with useful precision', () => {
    expect(formatTokens(15_028_000_000)).toBe('15.03B');
    expect(formatTokens(3_215_000_000)).toBe('3.22B');
    expect(formatTokens(1_000_000_000)).toBe('1B');
    expect(formatTokens(375_000_000)).toBe('375M');
  });
});
