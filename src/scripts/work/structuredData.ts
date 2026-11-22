const SITE = 'https://tymultiverse.cc';

export interface ArticleMeta {
  title: string;
  description?: string;
  publishDate?: string;
  tags?: string[];
}

// schema.org TechArticle for a /work article; only fields the article really has.
export function articleStructuredData(article: ArticleMeta, slug: string): Record<string, unknown> {
  const url = `${SITE}/work/${slug}`;
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: article.title,
    url,
    mainEntityOfPage: url,
    inLanguage: 'zh-Hant',
    isPartOf: { '@id': `${SITE}/#website` },
    publisher: { '@type': 'Organization', name: 'TY 市場研究室', url: `${SITE}/` },
  };
  if (article.description) data.description = article.description;
  if (article.publishDate) data.datePublished = article.publishDate;
  if (article.tags?.length) data.keywords = article.tags.join(', ');
  return data;
}
