import { storageService } from '../../services/core/storageService';

export function markdownFromDraft(slug: string, draft: any) {
  return `---\nslug: ${slug}\ntitle: ${JSON.stringify(draft.title)}\ndescription: ${JSON.stringify(draft.description)}\ncategory: ${JSON.stringify(draft.category)}\ntags: ${JSON.stringify(draft.tags)}\npublishDate: ${draft.publishDate}\n---\n\n${draft.content}\n`;
}

export function draftFromForm(form: FormData) {
  const text = (key: string) => String(form.get(key) || '');
  return { title: text('title'), description: text('description'), category: text('category'),
    tags: text('tags').split(',').map(value => value.trim()).filter(Boolean),
    content: text('content'), publishDate: new Date(`${text('date')}+08:00`).toISOString() };
}

export function initBlogEditor() {
  const form = document.querySelector<HTMLFormElement>('#blog-editor');
  if (!form || form.dataset.ready) return;
  form.dataset.ready = 'true';
  const status = document.getElementById('blog-status')!;
  const markdown = document.querySelector<HTMLTextAreaElement>('#blog-markdown')!;
  const fileInput = document.querySelector<HTMLInputElement>('#blog-markdown-file')!;
  let current: any;
  let dirty = false;
  let uploadedSlug: string | undefined;
  const field = (name: string) => form.elements.namedItem(name) as HTMLInputElement;
  form.addEventListener('input', () => { dirty = true; });
  markdown.addEventListener('input', () => { dirty = true; });
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    if (file.size > 550000 || !file.name.toLowerCase().endsWith('.md')) {
      say('請上傳小於 550 KB 的 .md / Upload a .md under 550 KB'); return;
    }
    markdown.value = await file.text();
    uploadedSlug = file.name.slice(0, -3);
    dirty = true;
    say('Markdown 已載入，按保存或發布直接入庫 / Ready to save or publish');
  });
  const say = (message: string) => { status.textContent = message; };
  const request = async (path = '', method = 'GET', body?: unknown, etag?: string) => {
    const token = storageService.get<string>('token');
    if (!token) throw new Error('請先以管理者登入 / Sign in as an administrator');
    const response = await fetch(`/tymultiverse/api/blog/admin/${path === '@import' ? 'import' : `articles${path}`}`, {
      method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(etag ? {'If-Match': etag} : {}) },
      ...(body ? {body: JSON.stringify(body)} : {}),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(`${response.status}: ${typeof result.detail === 'string' ? result.detail : '請檢查欄位或重新載入 / Check fields or reload'}`);
    return result;
  };
  const showState = () => {
    document.getElementById('blog-state')!.textContent = current ?
      `草稿版本 / Revision: ${current.revision} · ${current.deleted ? '回收區 / Deleted' : current.published ? '已發布 / Published' : '未發布 / Draft'} · 索引 / Index: ${current.indexStatus}` : '新草稿 / New draft';
    field('slug').readOnly = Boolean(current);
    form.querySelectorAll<HTMLButtonElement>('[data-blog-action]').forEach(button => {
      const action = button.dataset.blogAction;
      button.disabled = !current || (current.deleted && !['restore', 'trigger'].includes(action!)) || (!current.deleted && action === 'restore');
    });
  };
  const load = async (slug: string) => {
    current = await request(`/${slug}`);
    field('slug').value = slug;
    for (const name of ['title', 'description', 'content', 'category']) field(name).value = current.draft[name];
    field('tags').value = current.draft.tags.join(', ');
    field('date').value = new Date(new Date(current.draft.publishDate).valueOf() + 8 * 3600000).toISOString().slice(0,16);
    markdown.value = markdownFromDraft(slug, current.draft);
    dirty = false;
    showState();
  };
  const refresh = async () => {
    const articles = await request();
    const list = document.getElementById('blog-admin-list')!;
    list.replaceChildren();
    for (const article of articles) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = `${article.deleted ? '[回收區]' : article.published ? '[已發布]' : '[草稿]'} ${article.draft.title}`;
      button.addEventListener('click', () => {
        if (dirty) { say('尚有未保存變更，請先保存 / Save your changes first'); return; }
        void busy(() => load(article.id));
      });
      list.append(button);
    }
  };
  const busy = async (operation: () => Promise<void>) => {
    const buttons = [...document.querySelectorAll<HTMLButtonElement>('.knowledge-page button')];
    buttons.forEach(button => { button.disabled = true; });
    say('處理中 / Working…');
    try { await operation(); }
    catch (error) { say(error instanceof Error ? error.message : '操作失敗 / Failed'); }
    finally { buttons.forEach(button => { button.disabled = false; }); showState(); }
  };
  document.getElementById('blog-refresh')!.addEventListener('click', () => void busy(async () => { await refresh(); say('文章已載入 / Articles loaded'); }));
  document.getElementById('blog-new')!.addEventListener('click', () => {
    if (dirty) { say('尚有未保存變更，請先保存 / Save your changes first'); return; }
    current = undefined; uploadedSlug = undefined; fileInput.value = ''; form.reset();
    markdown.value = markdownFromDraft('new-article', { title: '文章標題', description: '文章摘要', category: 'Engineering', tags: ['Astro'], publishDate: new Date().toISOString(), content: '## 背景\n\n## 實作\n\n## 驗證\n' });
    showState(); say('可開始建立新草稿 / Ready for a new draft');
  });
  const saveMarkdown = (publish: boolean) => void busy(async () => {
    current = await request('@import', 'POST', {
      markdown: markdown.value,
      ...(current ? {slug: current.id} : uploadedSlug ? {slug: uploadedSlug} : {}),
      operation: current ? 'update' : 'create', publish,
    }, current?.etag);
    dirty = false;
    await load(current.id);
    await refresh();
    say(publish ? '已發布，向量化已排入背景流程 / Published; vectorization queued' : 'Markdown 已直接保存至 DB / Markdown saved to DB');
  });
  document.getElementById('blog-markdown-form')!.addEventListener('submit', event => { event.preventDefault(); saveMarkdown(false); });
  document.getElementById('blog-markdown-publish')!.addEventListener('click', () => { if (markdown.reportValidity()) saveMarkdown(true); });
  form.addEventListener('submit', event => {
    event.preventDefault();
    void busy(async () => {
      const slug = field('slug').value;
      current = await request(`/${slug}`, current ? 'PUT' : 'POST', draftFromForm(new FormData(form)), current?.etag);
      dirty = false; await load(slug); await refresh(); say('草稿已保存，尚未發布 / Draft saved');
    });
  });
  form.querySelectorAll<HTMLButtonElement>('[data-blog-action]').forEach(button => button.addEventListener('click', () => {
    if (dirty) { say('請先保存草稿再操作 / Save the draft first'); return; }
    void busy(async () => {
      const action = button.dataset.blogAction!;
      const slug = field('slug').value;
      current = await request(`/${slug}${action === 'delete' ? '' : `/${action}`}`, action === 'delete' ? 'DELETE' : 'POST', undefined, current.etag);
      if (action !== 'trigger') {
        // A durable pending event already exists even if the following request fails.
        try { current = await request(`/${slug}/trigger`, 'POST'); }
        catch { await load(slug); say('文章狀態已保存；索引待重試 / Saved; retry indexing'); await refresh(); return; }
      }
      await refresh();
      say(current.indexStatus === 'failed' ? '文章狀態已保存；索引失敗，可重試 / Saved; index failed' : '操作完成 / Done');
    });
  }));
  showState();
  markdown.value = markdownFromDraft('new-article', { title: '文章標題', description: '文章摘要', category: 'Engineering', tags: ['Astro'], publishDate: new Date().toISOString(), content: '## 背景\n\n## 實作\n\n## 驗證\n' });
}
