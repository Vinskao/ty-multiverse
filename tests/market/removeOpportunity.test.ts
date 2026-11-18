import { describe, it, expect, vi } from 'vitest';
import { removeOpportunity } from '../../src/scripts/market/removeOpportunity';

describe('removeOpportunity', () => {
  it('reads the complete selection and removes only the requested code', async () => {
    const request = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ symbols: [{ code: '3037', name: 'A' }, { code: '2454', name: 'B' }] }), { status: 200 })).mockResolvedValueOnce(new Response('{}', { status: 200 }));
    await removeOpportunity(request, '/custom', { Authorization: 'Bearer test' }, '3037');
    expect(JSON.parse(request.mock.calls[1][1].body)).toEqual({ symbols: [{ code: '2454', name: 'B' }] });
  });
  it('does not write when reading fails and reports write failures', async () => {
    const readFail = vi.fn().mockResolvedValue(new Response('', { status: 503 }));
    await expect(removeOpportunity(readFail, '/custom', {}, '3037')).rejects.toThrow();
    expect(readFail).toHaveBeenCalledTimes(1);
    const writeFail = vi.fn().mockResolvedValueOnce(new Response('{"symbols":[]}', { status: 200 })).mockResolvedValueOnce(new Response('', { status: 403 }));
    await expect(removeOpportunity(writeFail, '/custom', {}, '3037')).rejects.toThrow();
  });
});
