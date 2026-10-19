import { afterEach, describe, expect, it, vi } from 'vitest';
import { mountDiaryPanel } from '../../src/scripts/diary/panel';

function fixture() {
  const root = document.createElement('section');
  root.innerHTML = `<p id="diary-status"></p><div id="diary-reminder" hidden></div>
    <form id="diary-import-form"><input id="diary-date"><select id="diary-category"><option value="general">General</option><option value="investment">Investment</option></select><input id="diary-title"><input id="diary-file" type="file"><textarea id="diary-markdown"></textarea><button type="submit">Save</button></form>
    <form id="diary-filter-form"><input id="diary-from"><input id="diary-to"><select id="diary-filter-category"><option value="all">All</option><option value="investment">Investment</option></select><input id="diary-undated" type="checkbox"></form>
    <button id="diary-copy-prompt"></button><button id="diary-dismiss"></button><button id="diary-close"></button><button id="diary-download"></button>
    <ul id="diary-list"></ul><article id="diary-reader" hidden><h3 id="diary-reader-title"></h3><pre id="diary-reader-body"></pre></article>`;
  document.body.append(root); return root;
}
afterEach(() => { document.body.replaceChildren(); });
describe('diary rendering and lifecycle', () => {
  it('renders imported markup as text and clears private content when disposed', async () => {
    const root = fixture();
    const entry = { id: 'one', entryDate: '2026-10-18', title: '<img src=x onerror=alert(1)>', markdown: '<script>private()</script>' };
    const client = vi.fn().mockImplementation(async (path: string) => path === '/check-in' ? { pending: true } : path.startsWith('/entries?') ? { entries: [entry] } : entry);
    const cleanup = mountDiaryPanel(root, client);
    await vi.waitFor(() => expect(root.querySelector('#diary-list button')).not.toBeNull());
    expect(root.querySelector('img')).toBeNull();
    (root.querySelector('#diary-list button') as HTMLButtonElement).click();
    await vi.waitFor(() => expect(root.querySelector('#diary-reader-body')?.textContent).toBe(entry.markdown));
    expect(root.querySelector('script')).toBeNull();
    cleanup();
    expect(root.querySelector('#diary-reader-body')?.textContent).toBe('');
    expect(root.querySelector('#diary-list')?.children.length).toBe(0);
  });
  it('ignores late private responses after navigation or logout', async () => {
    const root = fixture();
    let resolve!: (value: unknown) => void;
    const client = vi.fn().mockReturnValue(new Promise(r => { resolve = r; }));
    const cleanup = mountDiaryPanel(root, client);
    const issued = client.mock.calls.length;  // check-in and the recent list start together on open
    cleanup(); resolve({ pending: true, entries: [{ id: 'late', entryDate: '2026-10-18', title: 'Late' }] });
    await Promise.resolve(); await Promise.resolve();
    expect((root.querySelector('#diary-reminder') as HTMLElement).hidden).toBe(true);
    expect(root.querySelector('#diary-list')?.textContent).toBe('');
    expect(client).toHaveBeenCalledTimes(issued);
  });
  it('lists recent entries on open without a date range, even when check-in fails', async () => {
    const root = fixture();
    const client = vi.fn().mockImplementation(async (path: string) => {
      if (path === '/check-in') throw new Error('Service unavailable');
      return { entries: [{ id: 'old', entryDate: '2023-05-01', title: 'Old note' }], hasMore: false };
    });
    const cleanup = mountDiaryPanel(root, client);
    await vi.waitFor(() => expect(root.querySelector('#diary-list')?.textContent).toContain('Old note'));
    const listCall = client.mock.calls.find(([path]) => path.startsWith('/entries?'))![0] as string;
    expect(listCall).toBe('/entries?category=all');
    root.querySelector('#diary-filter-form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await vi.waitFor(() => expect(client.mock.calls.at(-1)?.[0]).toMatch(/from=.*&to=/));
    cleanup();
  });
  it('sends category and undated filters, and labels approximate dates', async () => {
    const root = fixture();
    const client = vi.fn().mockImplementation(async (path: string) => path === '/check-in' ? { pending: false } : { entries: [{ id: 'a', entryDate: '2026-10-18', title: 'Test', category: 'investment', datePrecision: 'approximate', entryKind: 'event' }] });
    const cleanup = mountDiaryPanel(root, client);
    await vi.waitFor(() => expect(root.querySelector('#diary-list button')).not.toBeNull());
    expect(root.querySelector('#diary-list')?.textContent).toContain('約');
    (root.querySelector('#diary-filter-category') as HTMLSelectElement).value = 'investment';
    (root.querySelector('#diary-undated') as HTMLInputElement).checked = true;
    root.querySelector('#diary-filter-form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await vi.waitFor(() => expect(client.mock.calls.at(-1)?.[0]).toContain('category=investment&includeUndated=true'));
    cleanup();
  });
});
