// 2026-10-31: the site moved from https://peoplesystem.tatdvsonorth.com/tymultiverse/
// to the root of https://tymultiverse.cc/. ingress-nginx cannot build a 301 target from
// the request path without snippets, so the app answers old URLs itself.
export const SITE_ORIGIN = 'https://tymultiverse.cc';
const OLD_HOST = 'peoplesystem.tatdvsonorth.com';
const LEGACY_PREFIX = /^\/tymultiverse(?=\/|$)/;

/**
 * Absolute URL to permanently redirect to, or null when the URL is already current.
 * requestHost is the Host / X-Forwarded-Host header: Astro does not trust it for context.url,
 * so behind the Ingress url.hostname is localhost. It is only compared with OLD_HOST; the
 * target is always SITE_ORIGIN, so a forged header cannot send anyone off-site.
 */
export function legacyRedirect(url: URL, requestHost?: string | null): string | null {
  const hasPrefix = LEGACY_PREFIX.test(url.pathname);
  const host = (requestHost ?? url.hostname).split(',')[0].trim().replace(/:\d+$/, '').toLowerCase();
  if (!hasPrefix && host !== OLD_HOST && url.hostname !== OLD_HOST) return null;
  // Collapse leading slashes so "/tymultiverse//evil.example" cannot become a protocol-relative URL.
  const path = `/${url.pathname.replace(LEGACY_PREFIX, '').replace(/^\/+/, '')}`;
  return `${SITE_ORIGIN}${path}${url.search}`;
}
