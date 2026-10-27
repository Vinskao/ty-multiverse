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

// 2026-10-27: the article page keeps the search and category chosen in the list.
import { loadFilter, saveFilter } from '../../src/scripts/work/catalog';

describe('remembered list filter', () => {
  const memory = () => { const data = new Map<string, string>(); return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) }; };
  it('round-trips the query and category', () => {
    const storage = memory();
    saveFilter(storage, { query: 'java', category: 'Concurrency' });
    expect(loadFilter(storage)).toEqual({ query: 'java', category: 'Concurrency' });
  });
  it('falls back to an empty filter for missing, corrupt or unavailable storage', () => {
    const empty = { query: '', category: '' };
    expect(loadFilter(memory())).toEqual(empty);
    expect(loadFilter({ getItem: () => '{bad json', setItem: () => {} })).toEqual(empty);
    expect(loadFilter({ getItem: () => JSON.stringify({ query: 5, category: null }), setItem: () => {} })).toEqual(empty);
    expect(loadFilter(null)).toEqual(empty);
    expect(() => saveFilter({ getItem: () => null, setItem: () => { throw new Error('quota'); } }, { query: 'x', category: '' })).not.toThrow();
    expect(() => saveFilter(null, { query: 'x', category: '' })).not.toThrow();
  });
});
