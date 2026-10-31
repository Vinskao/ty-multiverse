import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { initArticleFilter } from '../../src/scripts/work/articleFilter';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const catalog = [
  { id: 'nio', data: { title: 'nio', description: '深入理解 Java NIO', category: 'Concurrency', tags: ['Java', 'NIO'], publishDate: '2025-09-16T00:00:00.000Z' } },
  { id: 'thread-pool', data: { title: 'thread-pool', description: 'Virtual Threads', category: 'Concurrency', tags: ['Java 21'], publishDate: '2025-09-07T00:00:00.000Z' } },
  { id: 'react-hydration', data: { title: 'react-hydration', description: 'SSR', category: 'React', tags: ['Astro'], publishDate: '2026-01-02T00:00:00.000Z' } },
];
const page = () => `<input id="article-search" /><select id="article-category"><option value=""></option><option value="Concurrency">Concurrency</option><option value="React">React</option></select>
  <p id="article-results"></p><p id="article-empty" hidden></p>
  <ol>${catalog.map((a) => `<li data-article-id="${a.id}"><a href="/work/${a.id}"${a.id === 'thread-pool' ? ' aria-current="page"' : ''}>${a.data.title}</a></li>`).join('')}</ol>
  <script type="application/json" id="article-catalog">${JSON.stringify(catalog)}</script>`;
const visible = () => [...document.querySelectorAll<HTMLElement>('[data-article-id]')].filter((row) => !row.hidden).map((row) => row.dataset.articleId);

describe('article list filter shared by the index and the article page', () => {
  beforeEach(() => { document.body.innerHTML = page(); sessionStorage.clear(); });

  it('filters the list as you type or pick a category, and says how many were found', () => {
    initArticleFilter(document);
    const input = document.getElementById('article-search') as HTMLInputElement;
    input.value = 'nio'; input.dispatchEvent(new Event('input'));
    expect(visible()).toEqual(['nio']);
    const category = document.getElementById('article-category') as HTMLSelectElement;
    input.value = ''; input.dispatchEvent(new Event('input'));
    category.value = 'Concurrency'; category.dispatchEvent(new Event('change'));
    expect(visible()).toEqual(['nio', 'thread-pool']);
    input.value = 'zzz'; input.dispatchEvent(new Event('input'));
    expect(visible()).toEqual([]);
    expect(document.getElementById('article-empty')!.hidden).toBe(false);
  });

  it('restores the filter on the next page, so the left list still shows the same results after opening an article', () => {
    const first = initArticleFilter(document);
    const input = document.getElementById('article-search') as HTMLInputElement;
    input.value = 'nio'; input.dispatchEvent(new Event('input'));
    first?.();
    document.body.innerHTML = page(); // the article page after navigation
    initArticleFilter(document);
    expect((document.getElementById('article-search') as HTMLInputElement).value).toBe('nio');
    expect(visible()).toEqual(['nio']);
  });
});

describe('article page layout (2026-10-27: list on the left, article on the right, like the stock panel)', () => {
  it('renders the filterable list beside the article', () => {
    const page = read('src/pages/work/[...slug].astro');
    expect(page).toContain("import ArticleSidebar from '../../components/ArticleSidebar.astro'");
    expect(page).toMatch(/knowledge-split/);
    expect(page.indexOf('<ArticleSidebar')).toBeLessThan(page.indexOf('knowledge-article'));
    const sidebar = read('src/components/ArticleSidebar.astro');
    for (const id of ['article-search', 'article-category', 'article-results', 'article-empty', 'article-catalog']) expect(sidebar).toContain(`id="${id}"`);
    expect(sidebar).toContain("aria-current={project.id === currentId ? 'page' : undefined}");
  });
  it('is two columns with a sticky list on wide screens and one column on narrow ones', () => {
    const css = read('src/styles/knowledge.css');
    expect(css).toMatch(/\.knowledge-split\s*\{[^}]*grid-template-columns:\s*minmax\(\d+px,\s*\d+px\)\s+minmax\(0,\s*1fr\)/);
    expect(css).toMatch(/\.knowledge-sidebar\s*\{[^}]*position:\s*sticky/);
    expect(css).toMatch(/@media\(max-width:900px\)\{[^}]*\.knowledge-split\{grid-template-columns:1fr\}/);
  });
});
