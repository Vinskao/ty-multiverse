import { afterEach, expect, it, vi } from 'vitest';
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
it('rejects anonymous access and forwards five years only after authorization succeeds', async () => {
  vi.stubEnv('MARKET_INTERNAL_SECRET', 'test-only');
  const { GET } = await import('../../src/pages/api/market/history');
  const fetch = vi.mocked(globalThis.fetch); fetch.mockReset();
  const anonymous = await GET({ request: new Request('http://localhost/api/market/history') } as any);
  expect(anonymous.status).toBe(401); expect(fetch).not.toHaveBeenCalled();
  fetch.mockResolvedValueOnce(new Response('{}', { status: 200 })).mockResolvedValueOnce(new Response('{"history":[]}'));
  const result = await GET({ request: new Request('http://localhost/api/market/history', { headers: { Authorization: 'Bearer test-only' } }) } as any);
  expect(result.status).toBe(200);
  expect(String(fetch.mock.calls[1][0])).toContain('portfolio/history?limit=1830');
});
it('does not read private history if authorization is denied', async () => {
  vi.stubEnv('MARKET_INTERNAL_SECRET', 'test-only');
  const { GET } = await import('../../src/pages/api/market/history');
  const fetch = vi.mocked(globalThis.fetch); fetch.mockReset(); fetch.mockResolvedValueOnce(new Response('{}', { status: 403 }));
  const result = await GET({ request: new Request('http://localhost/api/market/history', { headers: { Authorization: 'Bearer test-only' } }) } as any);
  expect(result.status).toBe(403); expect(fetch).toHaveBeenCalledOnce();
});
