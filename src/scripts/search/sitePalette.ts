// Nav bar search (Ctrl/Cmd+K): filters the site's page links and searches the full text of public reports
// through /api/market/reports/fulltext. A hit opens the report page with the same words already applied.

import { searchBenchmark, type BenchmarkEntry } from './benchmarkIndex';

type Hit = { report_id: string; title?: string; publisher?: string; page: number; snippet: string };
const KIND = { company: '研究圖・龍頭', holding: '研究圖・持股', claim: '研究圖・年報主張', theme: '研究圖・年度格局' } as const;

export function initSitePalette(
  doc: Document = document,
  fetcher: (url: string) => Promise<Response> = (url) => fetch(url, { cache: 'no-store' }),
  delayMs = 250,
): () => void {
  const box = doc.getElementById('site-search');
  const input = doc.getElementById('site-search-input') as HTMLInputElement | null;
  const results = doc.getElementById('site-search-results');
  const status = doc.getElementById('site-search-status');
  const opener = doc.getElementById('site-search-open');
  if (!box || !input || !results) return () => {};

  const undo: Array<() => void> = [];
  const on = (target: EventTarget, type: string, handler: EventListener) => {
    target.addEventListener(type, handler);
    undo.push(() => target.removeEventListener(type, handler));
  };
  const zh = () => doc.documentElement.lang !== 'en';
  const say = (text: string) => { if (status) status.textContent = text; };
  const entries = () => [...box.querySelectorAll<HTMLAnchorElement>('a[href]')].filter((link) => !link.hidden);
  const activate = (link: HTMLAnchorElement | undefined) => {
    box.querySelectorAll('[data-search-active]').forEach((item) => item.removeAttribute('data-search-active'));
    link?.setAttribute('data-search-active', '');
    link?.scrollIntoView?.({ block: 'nearest' });
  };

  const open = () => { box.hidden = false; input.focus(); input.select(); };
  const close = () => { box.hidden = true; activate(undefined); };

  let timer: ReturnType<typeof setTimeout> | undefined;
  let latest = 0;
  undo.push(() => clearTimeout(timer));

  // The supply-chain diagram index is fetched once, on the first query, and filtered locally after that.
  let benchmark: Promise<BenchmarkEntry[]> | undefined;
  const benchmarkIndex = () => (benchmark ??= fetcher('/api/search/benchmark')
    .then((response) => response.ok ? response.json() : { entries: [] })
    .then((payload: { entries?: BenchmarkEntry[] }) => payload.entries ?? [])
    .catch(() => { benchmark = undefined; return [] as BenchmarkEntry[]; }));

  const render = (q: string, hits: Hit[], diagram: BenchmarkEntry[] = []) => {
    results.replaceChildren();
    for (const entry of diagram) {
      const link = doc.createElement('a');
      link.href = entry.href;
      link.className = 'site-search-hit';
      link.dataset.searchKind = entry.kind;
      const title = doc.createElement('strong'); title.textContent = entry.title;
      const meta = doc.createElement('span'); meta.textContent = KIND[entry.kind];
      const detail = doc.createElement('small'); detail.textContent = entry.detail;
      link.append(title, meta, detail);
      results.append(link);
    }
    for (const hit of hits.slice(0, 30)) {
      const link = doc.createElement('a');
      link.href = `/reports/?q=${encodeURIComponent(q)}`;
      link.className = 'site-search-hit';
      const title = doc.createElement('strong'); title.textContent = hit.title || q;
      const meta = doc.createElement('span'); meta.textContent = [hit.publisher, `p.${hit.page}`].filter(Boolean).join(' · ');
      const snippet = doc.createElement('small'); snippet.textContent = `…${hit.snippet}…`;
      link.append(title, meta, snippet);
      results.append(link);
    }
    const anyPage = entries().some((link) => link.hasAttribute('data-search-page'));
    say(hits.length || diagram.length || anyPage ? '' : (zh() ? '找不到符合的報告或頁面。' : 'No matching reports or pages.'));
  };

  on(input, 'input', () => {
    const q = input.value.trim();
    const terms = q.toLocaleLowerCase().split(/\s+/).filter(Boolean);
    for (const link of box.querySelectorAll<HTMLElement>('[data-search-page]')) {
      const text = `${link.textContent ?? ''} ${link.getAttribute('href') ?? ''}`.toLocaleLowerCase();
      link.hidden = !terms.every((term) => text.includes(term));
    }
    activate(undefined);
    clearTimeout(timer);
    const ticket = ++latest;
    if (!q) { results.replaceChildren(); say(''); return; }
    say(zh() ? '搜尋報告全文中…' : 'Searching report text…');
    timer = setTimeout(() => {
      const reports = fetcher(`/api/market/reports/fulltext?q=${encodeURIComponent(q)}`)
        .then((response) => response.ok ? response.json() : { results: [] })
        .then((payload: { results?: Hit[] }) => payload.results ?? [])
        .catch(() => [] as Hit[]);
      void Promise.all([reports, benchmarkIndex()]).then(([hits, entries]) => {
        if (ticket === latest) render(q, hits, searchBenchmark(entries, q));
      });
    }, delayMs);
  });

  on(input, 'keydown', (event) => {
    const key = (event as KeyboardEvent).key;
    if (key !== 'ArrowDown' && key !== 'ArrowUp' && key !== 'Enter') return;
    const list = entries();
    const at = list.findIndex((link) => link.hasAttribute('data-search-active'));
    if (key === 'Enter') { (list[at] ?? list[0])?.click(); return; }
    event.preventDefault();
    if (!list.length) return;
    activate(list[(at + (key === 'ArrowDown' ? 1 : -1) + list.length) % list.length] ?? list[0]);
  });

  on(doc, 'keydown', (event) => {
    const key = event as KeyboardEvent;
    if (key.key === 'Escape' && !box.hidden) { close(); return; }
    if (key.key.toLowerCase() === 'k' && (key.ctrlKey || key.metaKey)) { key.preventDefault(); if (box.hidden) open(); else close(); }
  });
  if (opener) on(opener, 'click', open);
  on(box, 'click', (event) => {
    const target = event.target as Element;
    if (target === box || target.closest('[data-search-close]') || target.closest('a[href]')) close();
  });

  return () => { for (const off of undo.splice(0)) off(); };
}
