// 2026-11-16: users were logged out "every so often" although Keycloak sessions last 12h.
// The token check treated any gateway hiccup (502/503/500 during a deploy or restart) as "token invalid" and logged out.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function jwt(expSecondsFromNow: number) {
  const body = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + expSecondsFromNow }));
  return `x.${body}.y`;
}

describe('verifyToken keeps the session through transient failures', () => {
  let store: Record<string, string>;
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('PUBLIC_TYMG_URL', 'https://gw.test/tymg');
    store = {};  // tests/setup.ts makes localStorage a no-op; give this file a real one
    vi.spyOn(window.localStorage, 'getItem').mockImplementation((k: string) => store[k] ?? null);
    vi.spyOn(window.localStorage, 'setItem').mockImplementation((k: string, v: string) => { store[k] = String(v); });
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

  async function verify(status: number, body: unknown = {}) {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body), { status })));
    const { verifyToken } = await import('../../src/services/api/auth');
    return verifyToken(jwt(-10), 'refresh');
  }

  it.each([500, 502, 503, 504, 429])('does not log out on HTTP %i', async (status) => {
    expect((await verify(status)).valid).toBe(true);
  });

  it('accepts a refreshed token (Keycloak refresh response has access_token but no `active`)', async () => {
    const fresh = jwt(1500);
    const result = await verify(200, { access_token: fresh, refresh_token: 'r2', expires_in: 1500 });
    expect(result).toMatchObject({ valid: true, tokenRefreshed: true, accessToken: fresh, refreshToken: 'r2' });
    expect(localStorage.getItem('token')).toBe(fresh);  // raw, not JSON-quoted: other scripts read it with getItem
  });

  it('logs out when the gateway says the session is gone (401)', async () => {
    expect((await verify(401)).valid).toBe(false);
  });

  it('adopts tokens another tab already refreshed instead of logging out', async () => {
    const newer = jwt(600);
    localStorage.setItem('token', newer);
    localStorage.setItem('refreshToken', 'newer-refresh');
    const result = await verify(401);
    expect(result).toMatchObject({ valid: true, tokenRefreshed: true, accessToken: newer, refreshToken: 'newer-refresh' });
  });
});
