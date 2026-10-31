// 2026-10-31: the site moved from https://peoplesystem.tatdvsonorth.com/tymultiverse/
// to the root of https://tymultiverse.cc/. ingress-nginx cannot build a 301 target from
// the request path without snippets, so the app answers old URLs itself.
export const SITE_ORIGIN = 'https://tymultiverse.cc';
const OLD_HOST = 'peoplesystem.tatdvsonorth.com';
const LEGACY_PREFIX = /^\/tymultiverse(?=\/|$)/;

/** Absolute URL to permanently redirect to, or null when the URL is already current. */
export function legacyRedirect(url: URL): string | null {
  const hasPrefix = LEGACY_PREFIX.test(url.pathname);
  if (!hasPrefix && url.hostname !== OLD_HOST) return null;
  // Collapse leading slashes so "/tymultiverse//evil.example" cannot become a protocol-relative URL.
  const path = `/${url.pathname.replace(LEGACY_PREFIX, '').replace(/^\/+/, '')}`;
  return `${SITE_ORIGIN}${path}${url.search}`;
}
