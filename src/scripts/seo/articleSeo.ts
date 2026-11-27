import { SITE_ORIGIN } from './siteMetadata';

type ArticleLike = { id?: string; tags?: string[] };

/** Daily readings are short, daily and similar in shape: keep them readable but out of search and the sitemap (AdSense "low value content", 2026-11-27). */
export function isDailyReading(article: ArticleLike): boolean {
  return /^daily-reading-/.test(article.id ?? '') || (article.tags ?? []).includes('Daily Reading');
}

export function articleStructuredData(article: { title: string; description?: string; publishDate: string; tags?: string[] }, slug: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    ...(article.description ? { description: article.description } : {}),
    datePublished: article.publishDate,
    mainEntityOfPage: `${SITE_ORIGIN}/work/${slug}`,
    ...(article.tags?.length ? { keywords: article.tags.join(', ') } : {}),
    author: { '@type': 'Person', name: 'TY', url: `${SITE_ORIGIN}/about` },
    publisher: { '@type': 'Organization', name: 'TY Multiverse', url: SITE_ORIGIN },
  };
}
