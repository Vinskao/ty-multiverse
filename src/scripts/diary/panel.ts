import { createDiaryClient, diaryEntryLabel, exportPrompt, taipeiDate } from './client';
import { buildNarrative, entryDetail } from './narrative';
import { config } from '../../services/core/config';
import { storageService } from '../../services/core/storageService';

type Entry = { id: string; title: string; entryDate: string | null; markdown: string; category?: string; datePrecision?: string; entryKind?: string; metadataJson?: string | null };
type Summary = Omit<Entry, 'markdown'> & { description?: string | null };
type Reminder = { pending: boolean; triggeredAt: string | null; nextDueAt: string };
type Client = ReturnType<typeof createDiaryClient>;

export function mountDiaryPanel(root: HTMLElement, client: Client) {
  const get = <T extends HTMLElement>(id: string) => root.querySelector<T>(`#${id}`)!;
  const field = (id: string) => get<HTMLInputElement>(id);
  const status = get('diary-status');
  const list = get('diary-list');
  const reader = get('diary-reader');
  const story = get('diary-story');
  const lang = () => (window as any).AppLang?.get?.() === 'en' ? 'en' : 'zh';
  let active = true;
  let selected: Entry | null = null;
  let reminder: Reminder | null = null;
  let requestId = 0;
  const abort = new AbortController();
  const on = (id: string, event: string, handler: (e: Event) => void) => get(id).addEventListener(event, handler, { signal: abort.signal });
  const message = (text: string) => { if (active) status.textContent = text; };
  const close = () => {
    selected = null; reader.hidden = true; story.hidden = false;
    get('diary-reader-body').textContent = ''; get('diary-reader-title').textContent = ''; get('diary-reader-detail').replaceChildren();
  };
  const run = async (action: () => Promise<void>) => {
    try { await action(); } catch (error) { message(error instanceof Error ? error.message : '日記操作失敗，請重試。'); }
  };
  // recent: the latest entries across all dates, shown on open so nothing has to be searched first.
  const load = async (recent = false) => {
    if (!active) return;
    const sequence = ++requestId;
    const from = field('diary-from').value, to = field('diary-to').value;
    const category = get<HTMLSelectElement>('diary-filter-category').value;
    const includeUndated = String(field('diary-undated').checked);
    const query = recent ? new URLSearchParams({ category }) : new URLSearchParams({ from, to, category, includeUndated });
    const page = await client<{ entries: Summary[]; hasMore: boolean }>(`/entries?${query}`);
    if (!active || sequence !== requestId) return;
    close(); list.replaceChildren(); renderStory(page.entries);
    for (const entry of page.entries) {
      const item = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button'; button.textContent = diaryEntryLabel(entry, lang());
      button.addEventListener('click', () => void run(() => open(entry.id)), { signal: abort.signal });
      item.append(button); list.append(item);
    }
    message(page.hasMore ? (recent ? '只列出最新 200 篇，更早的請用日期查詢。' : '結果超過 200 篇，請縮小日期範圍。')
      : page.entries.length ? '' : recent ? '還沒有日記。' : '這段日期還沒有日記。');
  };
  // The storyline reads the listed events oldest to newest; text is set with textContent, never as HTML.
  const renderStory = (entries: Summary[]) => {
    const body = get('diary-story-body');
    body.replaceChildren();
    for (const chapter of buildNarrative(entries, lang())) {
      const heading = document.createElement('h4'); heading.textContent = chapter.heading;
      const items = document.createElement('ol');
      for (const passage of chapter.items) {
        const li = document.createElement('li');
        const button = document.createElement('button'); button.type = 'button'; button.className = 'diary-passage';
        const when = document.createElement('span'); when.className = 'diary-passage-date'; when.textContent = passage.date;
        const title = document.createElement('strong'); title.textContent = passage.title;
        const text = document.createElement('span'); text.className = 'diary-passage-text'; text.textContent = passage.text;
        button.append(...(passage.date ? [when] : []), title, text);
        button.addEventListener('click', () => void run(() => open(passage.id)), { signal: abort.signal });
        li.append(button); items.append(li);
      }
      body.append(heading, items);
    }
  };
  const open = async (id: string) => {
    const selection = ++requestId;
    const full = await client<Entry>(`/entries/${encodeURIComponent(id)}`);
    if (!active || selection !== requestId) return;
    selected = full;
    get('diary-reader-title').textContent = diaryEntryLabel(full, lang());
    const detail = entryDetail(full, lang());
    const parts: HTMLElement[] = [];
    if (detail) {
      const description = document.createElement('p'); description.className = 'diary-detail-description'; description.textContent = detail.description;
      parts.push(description);
      if (detail.notes) { const notes = document.createElement('p'); notes.className = 'diary-detail-notes'; notes.textContent = detail.notes; parts.push(notes); }
      if (detail.facts.length) { const facts = document.createElement('p'); facts.className = 'diary-detail-facts'; facts.textContent = detail.facts.join(' · '); parts.push(facts); }
      if (detail.tags.length) {
        const tags = document.createElement('ul'); tags.className = 'diary-detail-tags';
        for (const tag of detail.tags) { const li = document.createElement('li'); li.textContent = tag; tags.append(li); }
        parts.push(tags);
      }
    }
    get('diary-reader-detail').replaceChildren(...parts);
    get('diary-reader-body').textContent = full.markdown;
    get<HTMLDetailsElement>('diary-reader-raw').open = !detail;  // documents have no summary, so show their text
    story.hidden = true; reader.hidden = false;
    reader.scrollIntoView?.({ block: 'nearest' });
  };
  const check = async () => {
    const result = await client<Reminder>('/check-in', {});
    if (!active) return;
    reminder = result;
    get('diary-reminder').hidden = !result.pending;
  };
  field('diary-date').value = taipeiDate();
  field('diary-date').max = taipeiDate();
  field('diary-from').value = `${taipeiDate().slice(0, 7)}-01`;
  field('diary-to').value = taipeiDate();
  on('diary-filter-form', 'submit', e => { e.preventDefault(); void run(() => load()); });
  on('diary-close', 'click', close);
  on('diary-copy-prompt', 'click', () => void run(async () => {
    await navigator.clipboard.writeText(exportPrompt(taipeiDate())); message('已複製，請貼到手機的原對話。');
  }));
  on('diary-dismiss', 'click', () => void run(async () => {
    if (!reminder?.triggeredAt) return;
    await client('/acknowledge', { triggeredAt: reminder.triggeredAt }); await check();
  }));
  on('diary-file', 'change', () => void run(async () => {
    const file = field('diary-file').files?.[0];
    if (!file) return;
    if (file.size > 800000) throw new Error('MD 檔案過大，請拆分後匯入。');
    const text = await file.text();
    if (text.length > 200000) throw new Error('MD 最多 200,000 字元。');
    if (!active) return;
    get<HTMLTextAreaElement>('diary-markdown').value = text;
    if (!field('diary-title').value) field('diary-title').value = file.name.replace(/\.(md|markdown)$/i, '').slice(0, 200);
  }));
  on('diary-import-form', 'submit', e => {
    e.preventDefault();
    const button = get<HTMLButtonElement>('diary-import-form').querySelector<HTMLButtonElement>('[type="submit"]')!;
    if (button.disabled) return;
    button.disabled = true;
    void run(async () => {
      const result = await client<{ duplicate: boolean }>('/import', {
        entryDate: field('diary-date').value, title: field('diary-title').value,
        markdown: get<HTMLTextAreaElement>('diary-markdown').value,
        category: get<HTMLSelectElement>('diary-category').value,
      });
      if (!active) return;
      field('diary-from').value = field('diary-date').value;
      field('diary-to').value = field('diary-date').value;
      get<HTMLTextAreaElement>('diary-markdown').value = ''; field('diary-file').value = '';
      await load(); await check();
      message(result.duplicate ? '此份 MD 已匯入，沒有新增重複日記。' : '日記已保存。');
    }).finally(() => { if (active) button.disabled = false; });
  });
  on('diary-download', 'click', () => {
    if (!selected) return;
    const url = URL.createObjectURL(new Blob([selected.markdown], { type: 'text/markdown;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `diary-${selected.entryDate || 'undated'}.md`;
    link.click(); URL.revokeObjectURL(url);
  });
  // Independent: a failed check-in must not keep saved entries from showing.
  void run(() => load(true));
  void run(check);
  return () => { active = false; ++requestId; abort.abort(); close(); list.replaceChildren(); get('diary-story-body').replaceChildren(); status.textContent = ''; get('diary-reminder').hidden = true; get<HTMLTextAreaElement>('diary-markdown').value = ''; };
}

let cleanup: (() => void) | undefined;
function init() {
  cleanup?.();
  const root = document.getElementById('private-diary');
  if (!root) return;
  const client = createDiaryClient(config.api.backendUrl || '/tymb', () => storageService.get<string>(storageService.KEYS.TOKEN));
  cleanup = mountDiaryPanel(root, client);
}
if (typeof document !== 'undefined') {
  document.addEventListener('astro:page-load', init);
  document.addEventListener('astro:before-swap', () => cleanup?.());
  document.addEventListener('tym:auth-changed', init);
  window.addEventListener('storage', e => { if (e.key === 'token' || e.key === null) init(); });
}
