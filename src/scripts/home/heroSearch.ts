// Homepage hero: the search box and the topic ranking drive the existing report library controls
// (#market-report-search and the category buttons in #market-report-filters) instead of filtering on their own.

// public/scripts/lang.js: get() returns 'en' | 'zh'; onChange passes the event detail, not a bare language string.
type Lang = { get(): string; onChange(listener: (detail: { code: string }) => void): (() => void) | void };

function showReports(doc: Document) {
  doc.getElementById('market-reports')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
}

/** Binds the hero controls; returns a cleanup so a view transition can rebind without stacking listeners. */
export function initHeroSearch(doc: Document = document, onEvent: (event: 'hero_search' | 'topic_pick', target?: string) => void = () => {}): () => void {
  const undo: Array<() => void> = [];
  const on = (target: EventTarget, type: string, handler: EventListener) => {
    target.addEventListener(type, handler);
    undo.push(() => target.removeEventListener(type, handler));
  };

  const form = doc.getElementById('home-hero-search') as HTMLFormElement | null;
  // Every keystroke goes straight to the report search, so the list below narrows while the visitor types.
  const apply = () => {
    const search = doc.getElementById('market-report-search') as HTMLInputElement | null;
    if (!search || !form) return '';
    search.value = (form.querySelector<HTMLInputElement>('input[type="search"]')?.value ?? '').trim();
    search.dispatchEvent(new Event('input', { bubbles: true }));
    return search.value;
  };
  const box = form?.querySelector<HTMLInputElement>('input[type="search"]');
  if (box) on(box, 'input', () => { apply(); });
  if (form) on(form, 'submit', (event) => {
    event.preventDefault();
    if (apply()) onEvent('hero_search'); // the typed words are never reported, only that a search happened
    showReports(doc);
  });

  // A search opened from the nav bar arrives as /reports/?q=...; apply it to the report library.
  const preset = new URLSearchParams(doc.defaultView?.location.search ?? '').get('q')?.trim();
  const library = doc.getElementById('market-report-search') as HTMLInputElement | null;
  if (preset && library) {
    library.value = preset;
    library.dispatchEvent(new Event('input', { bubbles: true }));
    if (box) box.value = preset;
  }

  let waiting: MutationObserver | null = null;
  undo.push(() => waiting?.disconnect());
  for (const button of doc.querySelectorAll<HTMLElement>('[data-report-topic]')) on(button, 'click', () => {
    const filters = doc.getElementById('market-report-filters');
    const pick = () => {
      const filter = filters?.querySelector<HTMLElement>(`[data-tag-id="${button.dataset.reportTopic}"]`);
      filter?.click();
      return Boolean(filter);
    };
    waiting?.disconnect();
    onEvent('topic_pick', button.dataset.reportTopic ?? '');
    // The report list loads when it scrolls into view, so its category buttons may not exist yet.
    if (!pick() && filters) {
      waiting = new MutationObserver(() => { if (pick()) waiting?.disconnect(); });
      waiting.observe(filters, { childList: true });
    }
    showReports(doc);
  });

  const lang = (doc.defaultView as (Window & { AppLang?: Lang }) | null)?.AppLang;
  const label = (code: string) => {
    for (const item of doc.querySelectorAll<HTMLElement>('[data-report-topic]')) {
      const text = code === 'en' ? item.dataset.labelEn : item.dataset.labelZh;
      const target = item.querySelector('[data-topic-label]');
      if (text && target) target.textContent = text;
    }
    for (const input of doc.querySelectorAll<HTMLInputElement>('[data-placeholder-zh]')) {
      input.placeholder = (code === 'en' ? input.dataset.placeholderEn : input.dataset.placeholderZh) ?? input.placeholder;
    }
  };
  if (lang) {
    label(lang.get());
    const stop = lang.onChange((detail) => label(detail.code));
    if (typeof stop === 'function') undo.push(stop);
  }

  return () => { for (const off of undo.splice(0)) off(); };
}
