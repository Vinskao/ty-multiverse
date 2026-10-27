import { afterEach, describe, expect, it, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import { initBlogEditor } from '../../src/scripts/work/editor';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.innerHTML = ''; });

describe('Markdown clipboard entry', () => {
  it('saves pasted Markdown through import and does not call a sync endpoint', async () => {
    vi.spyOn(localStorage, 'getItem').mockImplementation(key => key === 'token' ? JSON.stringify('editor-token') : null);
    document.body.innerHTML = `
      <button id="blog-refresh"></button><button id="blog-new"></button>
      <p id="blog-status"></p><p id="blog-state"></p><div id="blog-admin-list"></div>
      <form id="blog-markdown-form"><input id="blog-markdown-file" type="file"><textarea id="blog-markdown"></textarea><button type="submit">Save</button><button id="blog-markdown-publish" type="button">Publish</button></form>
      <form id="blog-editor">${['slug','title','description','category','tags','date','content'].map(name => `<input name="${name}">`).join('')}<button type="submit">Save</button></form>`;
    const draft = { title: '工程紀錄', description: '摘要', content: '## 正文', category: 'Engineering', tags: ['TDD'], publishDate: '2026-10-27T01:00:00Z' };
    const state = { id: 'engineering', revision: 'r1', published: null, deleted: false, indexStatus: 'idle', etag: '1', draft };
    const fetcher = vi.fn().mockImplementation(async (url, init) => {
      if (url.endsWith('/import')) return Response.json(state);
      if (url.endsWith('/engineering')) return Response.json(state);
      return Response.json([state]);
    });
    vi.stubGlobal('fetch', fetcher);
    initBlogEditor();
    const input = document.querySelector<HTMLTextAreaElement>('#blog-markdown')!;
    const text = '---\nslug: engineering\ntitle: 工程紀錄\n---\n\n## 正文';
    input.value = text;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    document.getElementById('blog-markdown-form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await waitFor(() => expect(document.getElementById('blog-status')!.textContent).toContain('Markdown 已直接保存至 DB'));
    expect(fetcher.mock.calls[0][0]).toBe('/tymultiverse/api/blog/admin/import');
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({ markdown: text, operation: 'create', publish: false });
    expect(fetcher.mock.calls.every(([url]) => !url.includes('sync'))).toBe(true);
    expect(input.value).toContain('slug: engineering');
    // Updating a loaded article carries both identity and the optimistic version.
    input.value = input.value.replace('正文', '新正文');
    input.dispatchEvent(new Event('input', {bubbles:true}));
    document.getElementById('blog-markdown-form')!.dispatchEvent(new Event('submit', {bubbles:true,cancelable:true}));
    await waitFor(() => expect(fetcher.mock.calls.filter(([url]) => url.endsWith('/import'))).toHaveLength(2));
    const update = fetcher.mock.calls.filter(([url]) => url.endsWith('/import'))[1][1];
    expect(update.headers['If-Match']).toBe('1');
    expect(JSON.parse(update.body)).toMatchObject({slug:'engineering',operation:'update'});
    await waitFor(() => expect(document.getElementById('blog-status')!.textContent).toContain('Markdown 已直接保存至 DB'));
    document.getElementById('blog-new')!.click();
    const file = new File(['# Body'], 'from-file.md', {type:'text/markdown'});
    Object.defineProperty(file, 'text', {value: async () => '---\ntitle: Uploaded\n---\n## Body'});
    const fileInput = document.querySelector<HTMLInputElement>('#blog-markdown-file')!;
    Object.defineProperty(fileInput, 'files', {configurable:true,value:[file]});
    fileInput.dispatchEvent(new Event('change', {bubbles:true}));
    await waitFor(() => expect(document.getElementById('blog-status')!.textContent).toContain('Markdown 已載入'));
    document.getElementById('blog-markdown-form')!.dispatchEvent(new Event('submit', {bubbles:true,cancelable:true}));
    await waitFor(() => expect(fetcher.mock.calls.filter(([url]) => url.endsWith('/import'))).toHaveLength(3));
    const uploaded = fetcher.mock.calls.filter(([url]) => url.endsWith('/import'))[2][1];
    expect(JSON.parse(uploaded.body)).toMatchObject({slug:'from-file',operation:'create'});
    await waitFor(() => expect(document.getElementById('blog-status')!.textContent).toContain('Markdown 已直接保存至 DB'));
  });
});
