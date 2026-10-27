import { describe, expect, it, vi } from 'vitest';
import { renderArticle } from '../../src/scripts/work/markdown';
import { proxyBlog } from '../../src/services/server/blog';
import { draftFromForm, markdownFromDraft } from '../../src/scripts/work/editor';
import i18n from '../../src/storages/i18n.json';
import lock from '../../package-lock.json';

it('ships the Markdown renderer in the production dependency set', () => {
  expect(lock.packages[''].dependencies.micromark).toBeTruthy();
  expect(lock.packages['node_modules/micromark'].dev).not.toBe(true);
});
import { retiredArticleSync } from '../../src/services/server/retiredArticleSync';

it('retires frontend sync without pruning the bucket-backed catalog', () => {
  expect(retiredArticleSync().status).toBe(410);
});

it('preserves readable Chinese catalog text and escapes frontmatter values', () => {
  expect(i18n.work.title.zh).toBe('工程知識庫與開發紀錄');
  for (const label of Object.values(i18n.work)) expect(label.zh).not.toMatch(/\?{2,}/);
  const markdown = markdownFromDraft('test', { title: 'Title: "quoted"', description: 'line1\nline2', tags: ['TDD'], category: 'Engineering', publishDate: '2026-10-27T00:00:00Z', content: '## Body' });
  expect(markdown).toContain('title: "Title: \\"quoted\\""');
  expect(markdown).toContain('description: "line1\\nline2"');
  expect(markdown).toContain('## Body');
});

it('converts the editor date from Taipei and trims tag separators', () => {
  const data = new FormData();
  data.set('date', '2026-10-27T09:30');
  data.set('tags', ' Astro, TDD, ,');
  expect(draftFromForm(data).publishDate).toBe('2026-10-27T01:30:00.000Z');
  expect(draftFromForm(data).tags).toEqual(['Astro', 'TDD']);
});

describe('bucket article rendering', () => {
  it('renders Markdown but escapes HTML and blocks script URLs', () => {
    const html = renderArticle('## 紀錄\n\n**Astro**\n\n<script>alert(1)</script>\n\n[bad](javascript:alert%281%29)');
    expect(html).toContain('<h2>紀錄</h2>');
    expect(html).toContain('<strong>Astro</strong>');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('href="javascript:');
  });
});
describe('blog proxy', () => {
  it('rejects arbitrary paths and anonymous writes before contacting upstream', async () => {
    const fetcher = vi.fn();
    expect((await proxyBlog(new Request('https://site/api'), '../qa', fetcher)).status).toBe(404);
    expect((await proxyBlog(new Request('https://site/api', { method: 'POST' }), 'admin/articles/test', fetcher)).status).toBe(401);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('forwards optimistic concurrency and auth only to the fixed article service', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('{}', { status: 409 }));
    const response = await proxyBlog(new Request('https://site/api', {method: 'PUT', headers: { Authorization: 'Bearer test', 'If-Match': 'v1' }, body: '{}'}), 'admin/articles/test', fetcher);
    expect(response.status).toBe(409);
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toMatch(/\/blog\/admin\/articles\/test$/);
    expect(init.headers.get('If-Match')).toBe('v1');
    expect(init.headers.get('Authorization')).toBe('Bearer test');
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });
});
