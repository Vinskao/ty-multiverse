// Search and category filter of the article list, used by the index page and by the sidebar of an article page.
import { filterArticles, loadFilter, saveFilter } from './catalog';
import i18n from '../../storages/i18n.json';

let cleanup: (() => void) | undefined;
const storageOf = () => { try { return window.sessionStorage; } catch { return null; } };

export function initArticleFilter(doc: Document = document): (() => void) | undefined {
  cleanup?.();
  const input = doc.querySelector<HTMLInputElement>('#article-search');
  const category = doc.querySelector<HTMLSelectElement>('#article-category');
  const source = doc.getElementById('article-catalog');
  if (!input || !category || !source) return undefined;
  const articles = JSON.parse(source.textContent || '[]').map((row: any) => ({ ...row, data: { ...row.data, publishDate: new Date(row.data.publishDate) } }));
  const storage = storageOf();
  const saved = loadFilter(storage);
  input.value = saved.query;
  category.value = [...category.options].some((option) => option.value === saved.category) ? saved.category : '';
  const render = () => {
    const found = filterArticles(articles, input.value, category.value);
    const ids = new Set(found.map((row: { id: string }) => row.id));
    doc.querySelectorAll<HTMLElement>('[data-article-id]').forEach((row) => { row.hidden = !ids.has(row.dataset.articleId!); });
    const lang = (window as any).AppLang?.get() === 'en' ? 'en' : 'zh';
    const results = doc.getElementById('article-results');
    if (results) results.textContent = i18n.work.resultCount[lang].replace('{count}', String(found.length));
    const empty = doc.getElementById('article-empty');
    if (empty) empty.hidden = found.length > 0;
  };
  const change = () => { saveFilter(storage, { query: input.value, category: category.value }); render(); };
  input.addEventListener('input', change);
  category.addEventListener('change', change);
  const off = (window as any).AppLang?.onChange(render);
  cleanup = () => { off?.(); input.removeEventListener('input', change); category.removeEventListener('change', change); };
  render();
  doc.querySelector('[aria-current="page"]')?.scrollIntoView?.({ block: 'nearest' }); // the open article stays visible in the list
  return cleanup;
}
