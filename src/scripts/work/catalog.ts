export interface Article {
  id: string;
  data: { title: string; description: string; category?: string; tags: string[]; publishDate: Date };
}

export function sortArticles<T extends Article>(articles: T[]): T[] {
  return [...articles].sort((a, b) => b.data.publishDate.valueOf() - a.data.publishDate.valueOf());
}

export function filterArticles<T extends Article>(articles: T[], query: string, category: string): T[] {
  const term = query.trim().toLowerCase();
  return articles.filter(({ data }) => (!category || data.category === category) &&
    [data.title, data.description, data.category || '', ...data.tags].join(' ').toLowerCase().includes(term));
}

export type FilterState = { query: string; category: string };
const FILTER_KEY = 'knowledge-filter';
type ReadableStorage = Pick<Storage, 'getItem'> | null;
type WritableStorage = Pick<Storage, 'setItem'> | null;

/** The search and category chosen in the list, kept in sessionStorage so the article page opens with the same results. */
export function loadFilter(storage: ReadableStorage): FilterState {
  const empty = { query: '', category: '' };
  try {
    const saved = JSON.parse(storage?.getItem(FILTER_KEY) ?? 'null');
    return saved && typeof saved.query === 'string' && typeof saved.category === 'string' ? { query: saved.query, category: saved.category } : empty;
  } catch { return empty; }
}

export function saveFilter(storage: WritableStorage, state: FilterState) {
  try { storage?.setItem(FILTER_KEY, JSON.stringify(state)); } catch { /* storage full or blocked: the filter just is not remembered */ }
}
