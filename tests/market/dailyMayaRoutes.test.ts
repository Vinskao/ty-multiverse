import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET as getAudio } from '../../src/pages/api/market/audio/[productType]/[code]/[revision]';

describe('market audio proxy', () => {
  afterEach(() => vi.restoreAllMocks());

  it('rejects malformed product identifiers before contacting the backend', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const response = await getAudio({ params: { productType: 'stock', code: '../secret', revision: '1' } } as never);
    expect(response.status).toBe(404);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('preserves the completed audio stream and content type', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(new Uint8Array([1, 2, 3]), { headers: { 'Content-Type': 'audio/mpeg' } }));
    const response = await getAudio({ params: { productType: 'stock', code: '2330', revision: '4' } } as never);
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('audio/mpeg');
    expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([1, 2, 3]);
  });

  it('proxies approved daily audio versions identified by UUID', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(new Uint8Array([7, 8, 9]), { headers: { 'Content-Type': 'audio/mpeg' } }),
    );
    const response = await getAudio({
      params: { productType: 'daily', code: '16d80368-5fdd-40f9-a7e5-5e69e3ad49eb', revision: '1' },
    } as never);
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('audio/mpeg');
    expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([7, 8, 9]);
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringMatching(/\/market\/audio\/daily\/16d80368-5fdd-40f9-a7e5-5e69e3ad49eb\/1$/),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });
});
