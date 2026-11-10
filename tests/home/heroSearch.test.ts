import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initHeroSearch } from '../../src/scripts/home/heroSearch';

const page = `
  <form id="home-hero-search"><input name="q" type="search" placeholder="代號或主題" data-placeholder-zh="代號或主題" data-placeholder-en="Ticker or topic" /><button type="submit">搜尋</button></form>
  <button type="button" data-report-topic="cooling" data-label-zh="散熱" data-label-en="Thermal &amp; Cooling"><span data-topic-label>散熱</span></button>
  <section id="market-reports">
    <div id="market-report-filters"></div>
    <input id="market-report-search" type="search" />
  </section>`;

describe('homepage hero search', () => {
  let cleanup = () => {};
  beforeEach(() => { document.body.innerHTML = page; });
  afterEach(() => { cleanup(); delete (window as any).AppLang; });

  it('sends the typed words to the existing report search and scrolls to the report library', () => {
    const search = document.getElementById('market-report-search') as HTMLInputElement;
    const filtered = vi.fn(); search.oninput = filtered;
    const scrolled = vi.fn(); document.getElementById('market-reports')!.scrollIntoView = scrolled;
    cleanup = initHeroSearch();
    (document.querySelector('#home-hero-search input') as HTMLInputElement).value = '  CPO 2330 ';
    const submit = new Event('submit', { cancelable: true });
    document.getElementById('home-hero-search')!.dispatchEvent(submit);
    expect(submit.defaultPrevented).toBe(true);
    expect(search.value).toBe('CPO 2330');
    expect(filtered).toHaveBeenCalledTimes(1);
    expect(scrolled).toHaveBeenCalledTimes(1);
  });

  it('filters on every keystroke without scrolling away from the box, and scrolls only on submit', () => {
    const search = document.getElementById('market-report-search') as HTMLInputElement;
    const filtered = vi.fn(); search.oninput = filtered;
    const scrolled = vi.fn(); document.getElementById('market-reports')!.scrollIntoView = scrolled;
    cleanup = initHeroSearch();
    const box = document.querySelector('#home-hero-search input') as HTMLInputElement;
    for (const typed of ['2', '23', '233']) { box.value = typed; box.dispatchEvent(new Event('input', { bubbles: true })); expect(search.value).toBe(typed); }
    expect(filtered).toHaveBeenCalledTimes(3);
    expect(scrolled).not.toHaveBeenCalled();
    box.value = ''; box.dispatchEvent(new Event('input', { bubbles: true }));
    expect(search.value).toBe('');
    document.getElementById('home-hero-search')!.dispatchEvent(new Event('submit', { cancelable: true }));
    expect(scrolled).toHaveBeenCalledTimes(1);
  });

  it('applies a ranked topic through the existing category button', () => {
    const filter = document.createElement('button'); filter.dataset.tagId = 'cooling';
    const picked = vi.fn(); filter.addEventListener('click', picked);
    document.getElementById('market-report-filters')!.append(filter);
    cleanup = initHeroSearch();
    document.querySelector<HTMLElement>('[data-report-topic]')!.click();
    expect(picked).toHaveBeenCalledTimes(1);
  });

  it('waits for the lazily loaded category buttons when the report list has not rendered yet', async () => {
    cleanup = initHeroSearch();
    document.querySelector<HTMLElement>('[data-report-topic]')!.click();
    const filter = document.createElement('button'); filter.dataset.tagId = 'cooling';
    const picked = vi.fn(); filter.addEventListener('click', picked);
    document.getElementById('market-report-filters')!.append(filter);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(picked).toHaveBeenCalledTimes(1);
  });

  it('shows topic names in the reader language and follows language changes', () => {
    // public/scripts/lang.js passes the event detail ({ code, qaLang }), not a bare language string.
    let listener: (detail: { code: string; qaLang: string }) => void = () => {};
    const stop = vi.fn();
    (window as any).AppLang = { get: () => 'en', onChange: (fn: (detail: { code: string; qaLang: string }) => void) => { listener = fn; return stop; } };
    cleanup = initHeroSearch();
    const label = document.querySelector('[data-topic-label]')!;
    expect(label.textContent).toBe('Thermal & Cooling');
    const input = document.querySelector<HTMLInputElement>('#home-hero-search input')!;
    expect(input.placeholder).toBe('Ticker or topic');
    listener({ code: 'zh', qaLang: 'chinese' });
    expect(label.textContent).toBe('散熱');
    expect(input.placeholder).toBe('代號或主題');
    listener({ code: 'en', qaLang: 'english' });
    expect(label.textContent).toBe('Thermal & Cooling');
    expect(input.placeholder).toBe('Ticker or topic');
    cleanup();
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('reports that a search or a topic pick happened, without the words typed', () => {
    const events = vi.fn();
    cleanup = initHeroSearch(document, events);
    const input = document.querySelector<HTMLInputElement>('#home-hero-search input')!;
    input.value = '';
    document.getElementById('home-hero-search')!.dispatchEvent(new Event('submit', { cancelable: true }));
    expect(events).not.toHaveBeenCalled(); // clearing the box is not a search
    input.value = '我的持股 2330';
    document.getElementById('home-hero-search')!.dispatchEvent(new Event('submit', { cancelable: true }));
    document.querySelector<HTMLElement>('[data-report-topic]')!.click();
    expect(events.mock.calls).toEqual([['hero_search'], ['topic_pick', 'cooling']]);
  });

  it('does not bind twice when the page script runs again after a view transition', () => {
    const search = document.getElementById('market-report-search') as HTMLInputElement;
    const filtered = vi.fn(); search.oninput = filtered;
    const first = initHeroSearch(); first();
    cleanup = initHeroSearch();
    document.getElementById('home-hero-search')!.dispatchEvent(new Event('submit', { cancelable: true }));
    expect(filtered).toHaveBeenCalledTimes(1);
  });
});
