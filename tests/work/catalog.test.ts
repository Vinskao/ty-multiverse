import { describe, expect, it } from 'vitest';
import { filterArticles, sortArticles } from '../../src/scripts/work/catalog';

const old = { id: 'java', data: { title: 'Java', description: '基礎筆記', category: 'Java', tags: ['JVM'], publishDate: new Date('2024-01-01') } };
const recent = { id: 'engineering', data: { title: '工程紀錄', description: 'SSR 與驗證', category: 'Engineering', tags: ['Astro'], publishDate: new Date('2026-10-27') } };
describe('knowledge catalog', () => {
  it('sorts newest first without mutating the source', () => {
    const source = [old, recent];
    expect(sortArticles(source)).toEqual([recent, old]);
    expect(source).toEqual([old, recent]);
  });
  it('searches title, description, tags and category case insensitively', () => {
    for (const query of ['工程', ' ssr ', 'ASTRO', 'engineering']) {
      expect(filterArticles([old, recent], query, '')).toEqual([recent]);
    }
  });
  it('combines category and search and supports empty results/reset', () => {
    expect(filterArticles([old, recent], 'Astro', 'Java')).toEqual([]);
    expect(filterArticles([old, recent], '', '')).toHaveLength(2);
    expect(filterArticles([], '', '')).toEqual([]);
  });
});
