import { describe, it, expect, vi } from 'vitest';
import { buyOpportunities } from '../../src/scripts/market/opportunities';

describe('opportunity pool', () => {
  it('keeps only instruments with a current buy conclusion', async () => {
    const rows = [{ code: '2454' }, { code: '3037' }, { code: '1234' }, { code: '9999' }];
    const contents: Record<string, string | null> = { '2454': '【結論】中立（止穩轉買）', '3037': '【結論】買', '1234': '【結論】賣', '9999': null };
    expect(await buyOpportunities(rows, async row => contents[row.code])).toEqual([rows[1]]);
  });
  it('does not display an instrument whose analysis cannot be loaded', async () => {
    const rows = [{ code: '2454' }, { code: '3037' }];
    expect(await buyOpportunities(rows, vi.fn(async row => { if (row.code === '2454') throw new Error('offline'); return 'Conclusion: Buy'; }))).toEqual([rows[1]]);
  });
});
