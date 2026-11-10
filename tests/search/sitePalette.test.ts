import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initSitePalette } from '../../src/scripts/search/sitePalette';

const page = `
  <button id="site-search-open" type="button">Search</button>
  <div id="site-search" hidden>
    <input id="site-search-input" type="search" />
    <div id="site-search-pages"><a href="/reports/" data-search-page>報告 Reports</a><a href="/macro/" data-search-page>總體 Macro</a></div>
    <div id="site-search-results"></div>
    <p id="site-search-status"></p>
  </div>`;
const reply = (results: unknown[]) => Promise.resolve({ ok: true, json: () => Promise.resolve({ results }) } as Response);
const type = (text: string) => {
  const input = document.getElementById('site-search-input') as HTMLInputElement;
  input.value = text;
  input.dispatchEvent(new Event('input', { bubbles: true }));
};

describe('nav bar search palette', () => {
  let cleanup = () => {};
  beforeEach(() => { vi.useFakeTimers(); document.body.innerHTML = page; });
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it('opens from the nav button or Ctrl/Cmd+K and closes on Escape', () => {
    cleanup = initSitePalette(document, () => reply([]));
    const box = document.getElementById('site-search')!;
    document.getElementById('site-search-open')!.click();
    expect(box.hidden).toBe(false);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(box.hidden).toBe(true);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
    expect(box.hidden).toBe(false);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
    expect(box.hidden).toBe(true);
  });

  it('searches the full text of reports as you type and links each hit to the report page', async () => {
    const fetcher = vi.fn(() => reply([{ report_id: 'r1', title: 'Q3 法說', publisher: 'IR', page: 4, snippet: '矽光子良率提升' }]));
    cleanup = initSitePalette(document, fetcher, 100);
    document.getElementById('site-search-open')!.click();
    type('矽');
    type('矽光子');
    await vi.advanceTimersByTimeAsync(100);
    expect(fetcher).toHaveBeenCalledTimes(1);
    const hit = document.querySelector<HTMLAnchorElement>('#site-search-results a')!;
    expect(hit.getAttribute('href')).toBe('/reports/?q=' + encodeURIComponent('矽光子'));
    expect(hit.textContent).toContain('Q3 法說');
    expect(hit.textContent).toContain('p.4');
    expect(hit.textContent).toContain('矽光子良率提升');
  });

  it('filters the page links by the typed words and says when nothing matches', async () => {
    cleanup = initSitePalette(document, () => reply([]), 50);
    type('macro');
    const pages = [...document.querySelectorAll<HTMLElement>('[data-search-page]')];
    expect(pages.map((link) => link.hidden)).toEqual([true, false]);
    type('zzz');
    await vi.advanceTimersByTimeAsync(50);
    expect(document.getElementById('site-search-status')!.textContent).toBeTruthy();
    type('');
    expect(pages.every((link) => !link.hidden)).toBe(true);
    expect(document.querySelector('#site-search-results a')).toBeNull();
  });

  it('moves through the visible entries with the arrow keys', () => {
    cleanup = initSitePalette(document, () => reply([]));
    document.getElementById('site-search-open')!.click();
    const input = document.getElementById('site-search-input')!;
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(document.querySelector('[data-search-active]')?.getAttribute('href')).toBe('/reports/');
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(document.querySelector('[data-search-active]')?.getAttribute('href')).toBe('/macro/');
  });
});
