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

describe('removeWatched', () => {
  it('sends DELETE for the AI-found stock to its own endpoint', async () => {
    const { removeWatched } = await import('../../src/scripts/market/removeOpportunity');
    const request = vi.fn(async () => new Response('{}', { status: 200 }));
    await removeWatched(request as unknown as typeof fetch, '/api/market/dashboard/watch', { Authorization: 'Bearer t' }, '3443');
    expect(request).toHaveBeenCalledWith('/api/market/dashboard/watch/3443', expect.objectContaining({ method: 'DELETE' }));
  });
  it('throws when the server refuses', async () => {
    const { removeWatched } = await import('../../src/scripts/market/removeOpportunity');
    await expect(removeWatched((async () => new Response('', { status: 403 })) as unknown as typeof fetch, '/x', {}, '3443')).rejects.toThrow('HTTP 403');
  });
});
