import { describe, expect, it } from 'vitest';
import { articleStructuredData } from '../../src/scripts/work/structuredData';

const article = {
  title: 'Redis 為什麼快？Key-Value 記憶體資料庫與分散式鎖、非同步結果實戰',
  description: '說明 Redis 以記憶體為核心的設計理由。',
  publishDate: '2025-09-20T00:00:00.000Z',
  tags: ['Redis', 'Spring Boot'],
};

describe('article structured data', () => {
  it('describes a /work article as a TechArticle published by the site', () => {
    const data = articleStructuredData(article, 'redis');
    expect(data).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'TechArticle',
      headline: article.title,
      description: article.description,
      datePublished: article.publishDate,
      url: 'https://tymultiverse.cc/work/redis',
      mainEntityOfPage: 'https://tymultiverse.cc/work/redis',
      inLanguage: 'zh-Hant',
      keywords: 'Redis, Spring Boot',
      isPartOf: { '@id': 'https://tymultiverse.cc/#website' },
    });
  });

  it('omits fields the article does not have instead of inventing them', () => {
    const data = articleStructuredData({ title: 't', description: '', publishDate: '', tags: [] }, 'x');
    expect(data).not.toHaveProperty('description');
    expect(data).not.toHaveProperty('datePublished');
    expect(data).not.toHaveProperty('keywords');
  });
});
