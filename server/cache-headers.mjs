// Cache policy for static files served by the Astro node server.
// The adapter's own immutable header for /_astro did not take effect in production (observed max-age=0),
// so the policy is applied here, in one place, on every response.
import http from 'node:http';

const YEAR = 'public, max-age=31536000, immutable';
const DAY = 'public, max-age=86400, must-revalidate';
const STATIC_EXT = /\.(?:svg|png|jpe?g|gif|webp|avif|ico|woff2?|ttf|otf|mp4|webm)$/i;

export function assetCacheControl(url) {
  const path = String(url).split('?')[0];
  if (path.startsWith('/_astro/')) return YEAR;
  if (path.startsWith('/api/')) return null;
  return STATIC_EXT.test(path) ? DAY : null;
}

let installed = false;
export function installCacheHeaders() {
  if (installed) return;
  installed = true;
  const original = http.ServerResponse.prototype.writeHead;
  http.ServerResponse.prototype.writeHead = function patched(status, ...rest) {
    const policy = this.req && typeof this.req.url === 'string' && status === 200 ? assetCacheControl(this.req.url) : null;
    if (policy) this.setHeader('Cache-Control', policy);
    return original.call(this, status, ...rest);
  };
}

installCacheHeaders();
