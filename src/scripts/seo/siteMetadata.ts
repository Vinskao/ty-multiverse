export const SITE_ORIGIN = 'https://tymultiverse.cc';
export const SOCIAL_IMAGE = `${SITE_ORIGIN}/assets/og-market-lab.png`;

export type PageMetadata = { canonical?: string; robots: string };
export type PageMetadataOptions = { canonical?: string; indexable?: boolean };

export function resolvePageMetadata(pathname: string, options: PageMetadataOptions = {}): PageMetadata {
  if (options.indexable === false) return { canonical: undefined, robots: 'noindex,follow' };

  const canonical = new URL(options.canonical ?? pathname, SITE_ORIGIN);
  if (canonical.origin !== SITE_ORIGIN) throw new Error(`Canonical URL must use the same origin: ${SITE_ORIGIN}`);
  canonical.search = '';
  canonical.hash = '';

  return { canonical: canonical.href, robots: 'index,follow,max-image-preview:large' };
}

function escapeXml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}

export function buildSitemapXml(paths: string[]): string {
  const urls = [...new Set(paths.map((path) => {
    const url = new URL(path, SITE_ORIGIN);
    if (url.origin !== SITE_ORIGIN) throw new Error(`Sitemap URL must use the same origin: ${SITE_ORIGIN}`);
    url.search = '';
    url.hash = '';
    return url.href;
  }))];

  const entries = urls.map((url) => `  <url><loc>${escapeXml(url)}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}
