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
