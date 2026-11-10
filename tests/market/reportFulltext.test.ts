import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createFulltextSearch } from '../../src/scripts/market/reportFulltext';
import { filterMarketReports } from '../../src/scripts/market/reports';

describe('full-text report search behind the homepage search box', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  const reply = (results: unknown[]) => Promise.resolve({ ok: true, json: () => Promise.resolve({ results }) } as Response);

  it('asks the server once typing pauses, and hands back the matching reports with page and snippet', async () => {
    const fetcher = vi.fn(() => reply([{ report_id: 'r1', page: 4, snippet: '…矽光子良率…' }]));
    const changed = vi.fn();
    const search = createFulltextSearch(fetcher, changed, 200);
    search.query('矽'); search.query('矽光'); search.query('矽光子');
    expect(fetcher).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(200);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][0]).toContain('q=' + encodeURIComponent('矽光子'));
    expect(search.matches().get('r1')).toEqual({ page: 4, snippet: '…矽光子良率…' });
    expect(changed).toHaveBeenCalled();
  });

  it('drops a slow answer to an older query and clears matches when the box is emptied', async () => {
    let finishOld: (value: Response) => void = () => {};
    const fetcher = vi.fn()
      .mockImplementationOnce(() => new Promise<Response>((done) => { finishOld = done; }))
      .mockImplementationOnce(() => reply([{ report_id: 'new', page: 1, snippet: 'b' }]));
    const search = createFulltextSearch(fetcher, () => {}, 100);
    search.query('old'); await vi.advanceTimersByTimeAsync(100);
    search.query('new'); await vi.advanceTimersByTimeAsync(100);
    finishOld({ ok: true, json: () => Promise.resolve({ results: [{ report_id: 'old', page: 1, snippet: 'a' }] }) } as Response);
    await vi.advanceTimersByTimeAsync(0);
    expect([...search.matches().keys()]).toEqual(['new']);
    search.query('  ');
    expect(search.matches().size).toBe(0);
    await vi.advanceTimersByTimeAsync(100);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('keeps the title and claim search working when the server fails', async () => {
    const search = createFulltextSearch(() => Promise.reject(new Error('down')), () => {}, 50);
    search.query('cpo'); await vi.advanceTimersByTimeAsync(50);
    expect(search.matches().size).toBe(0);
  });

  it('shows a report whose body matches even when its title and claims do not', () => {
    const report = { id: 'r1', title: 'Q3 call', publisher: 'IR', status: 'ready', claims: [{ claim: 'margin up', segment: 'foundry' }] } as any;
    expect(filterMarketReports([report], 'all', '矽光子')).toEqual([]);
    expect(filterMarketReports([report], 'all', '矽光子', new Set(['r1']))).toEqual([report]);
    expect(filterMarketReports([report], 'cpo', '矽光子', new Set(['r1']))).toEqual([]);
  });
});
