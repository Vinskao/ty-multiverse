import http from 'node:http';
import { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { assetCacheControl, installCacheHeaders } from '../../server/cache-headers.mjs';

describe('assetCacheControl', () => {
  it('hashed build assets are cached for a year and immutable', () => {
    expect(assetCacheControl('/_astro/global.JmBz8GKt.css')).toBe('public, max-age=31536000, immutable');
    expect(assetCacheControl('/_astro/api.DHWUQATO.js?x=1')).toBe('public, max-age=31536000, immutable');
  });
  it('un-hashed images, icons and fonts get one day, then revalidate', () => {
    for (const path of ['/favicon.svg', '/icons/a.png', '/assets/x.webp', '/assets/f.woff2']) {
      expect(assetCacheControl(path)).toBe('public, max-age=86400, must-revalidate');
    }
  });
  it('pages, API routes and data are left alone', () => {
    for (const path of ['/', '/learn/', '/api/market/audio', '/api/market/audio/daily/x/1', '/robots.txt', '/sitemap.xml']) {
      expect(assetCacheControl(path)).toBeNull();
    }
  });
});

describe('installCacheHeaders', () => {
  let server: http.Server;
  afterEach(() => new Promise<void>(resolve => server.close(() => resolve())));

  async function get(path: string, status = 200, own?: string) {
    installCacheHeaders();
    server = http.createServer((_req, res) => {
      if (own) res.setHeader('Cache-Control', own);
      res.writeHead(status, { 'Content-Type': 'text/plain' });
      res.end('x');
    });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as AddressInfo;
    return new Promise<{ headers: { get(name: string): string | null } }>((resolve, reject) => {
      http.get(`http://127.0.0.1:${port}${path}`, res => {
        res.resume();
        resolve({ headers: { get: name => (res.headers[name.toLowerCase()] as string | undefined) ?? null } });
      }).on('error', reject);
    });
  }

  it('overrides the adapter default max-age=0 on hashed assets', async () => {
    const response = await get('/_astro/app.Abc123.js', 200, 'public, max-age=0');
    expect(response.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
  });
  it('never caches errors and keeps API cache headers', async () => {
    expect((await get('/_astro/missing.js', 404, 'public, max-age=0')).headers.get('cache-control')).toBe('public, max-age=0');
    await new Promise<void>(resolve => server.close(() => resolve()));
    expect((await get('/api/market/audio', 200, 'no-store')).headers.get('cache-control')).toBe('no-store');
  });
});

describe('Dockerfile wiring', () => {
  it('copies the policy module into the runtime image and loads it before the server starts', async () => {
    const { readFileSync } = await import('node:fs');
    const dockerfile = readFileSync('Dockerfile', 'utf8');
    expect(dockerfile).toMatch(/COPY --from=build \/app\/server \.\/server/);
    expect(dockerfile).toMatch(/CMD \["node", "--import", "\.\/server\/cache-headers\.mjs", "\.\/dist\/server\/entry\.mjs"\]/);
  });
});
