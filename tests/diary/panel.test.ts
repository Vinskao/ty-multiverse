import { afterEach, describe, expect, it, vi } from 'vitest';
import { mountDiaryPanel } from '../../src/scripts/diary/panel';

function fixture() {
  const root = document.createElement('section');
  root.innerHTML = `<p id="diary-status"></p><div id="diary-reminder" hidden></div>
    <form id="diary-import-form"><input id="diary-date"><select id="diary-category"><option value="general">General</option><option value="investment">Investment</option></select><input id="diary-title"><input id="diary-file" type="file"><textarea id="diary-markdown"></textarea><button type="submit">Save</button></form>
    <form id="diary-filter-form"><input id="diary-from"><input id="diary-to"><select id="diary-filter-category"><option value="all">All</option><option value="investment">Investment</option></select><input id="diary-undated" type="checkbox"></form>
    <button id="diary-copy-prompt"></button><button id="diary-dismiss"></button><button id="diary-close"></button><button id="diary-download"></button>
    <ul id="diary-list"></ul><section id="diary-story"><div id="diary-story-body"></div></section><article id="diary-reader" hidden><h3 id="diary-reader-title"></h3><div id="diary-reader-detail"></div><details id="diary-reader-raw"><pre id="diary-reader-body"></pre></details></article>`;
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
  it('tells the listed events as a storyline and opens a passage as readable prose', async () => {
    const root = fixture();
    const summaries = [
      { id: 'b', entryDate: '2026-10-18', title: 'Later', category: 'relationship', entryKind: 'event', description: 'Then this happened.' },
      { id: 'a', entryDate: '2025-11-13', title: 'Start', category: 'investment', entryKind: 'event', description: 'It began here.' },
    ];
    const full = { id: 'b', entryDate: '2026-10-18', title: 'Later', category: 'relationship', entryKind: 'event', markdown: '# Later\n```json\n{}\n```',
      metadataJson: JSON.stringify({ description: 'Then this happened.', notes: 'My side only.', confidence: 'high', tags: ['contact'] }) };
    const client = vi.fn().mockImplementation(async (path: string) => path === '/check-in' ? { pending: false } : path.startsWith('/entries?') ? { entries: summaries, hasMore: false } : full);
    const cleanup = mountDiaryPanel(root, client);
    await vi.waitFor(() => expect(root.querySelector('#diary-story-body')?.textContent).toContain('It began here.'));
    const story = root.querySelector('#diary-story-body')!.textContent!;
    expect(story.indexOf('It began here.')).toBeLessThan(story.indexOf('Then this happened.'));
    (Array.from(root.querySelectorAll('#diary-story-body button')).find((b) => b.textContent?.includes('Then this')) as HTMLButtonElement).click();
    await vi.waitFor(() => expect((root.querySelector('#diary-reader') as HTMLElement).hidden).toBe(false));
    expect((root.querySelector('#diary-story') as HTMLElement).hidden).toBe(true);
    expect(root.querySelector('#diary-reader-detail')?.textContent).toContain('My side only.');
    expect(root.querySelector('#diary-reader-detail')?.textContent).not.toContain('{');
    expect((root.querySelector('#diary-reader-raw') as HTMLDetailsElement).open).toBe(false);
    (root.querySelector('#diary-close') as HTMLButtonElement).click();
    expect((root.querySelector('#diary-story') as HTMLElement).hidden).toBe(false);
    cleanup();
    expect(root.querySelector('#diary-story-body')?.textContent).toBe('');
  });
  it('shows AI narratives as labeled interpretation in the storyline and in the opened entry', async () => {
    const root = fixture();
    const summary = { id: 'b', entryDate: '2026-10-18', title: 'Later', category: 'relationship', entryKind: 'event', description: 'Then this happened.' };
    const full = { ...summary, markdown: '# Later', metadataJson: JSON.stringify({ description: 'Then this happened.' }) };
    const narratives = { entries: { b: { narrative: 'I felt relieved but unsure.', stale: true } }, months: [{ month: '2026-10', narrative: 'October was tense.', stale: false }] };
    const client = vi.fn().mockImplementation(async (path: string) => path === '/check-in' ? { pending: false }
      : path === '/narratives' ? narratives : path.startsWith('/entries?') ? { entries: [summary], hasMore: false } : full);
    const cleanup = mountDiaryPanel(root, client);
    await vi.waitFor(() => expect(root.querySelector('#diary-story-body')?.textContent).toContain('October was tense.'));
    const story = root.querySelector('#diary-story-body')!;
    expect(story.textContent).toContain('I felt relieved but unsure.');
    expect(story.querySelectorAll('.diary-ai-label').length).toBeGreaterThanOrEqual(2);
    (story.querySelector('.diary-passage') as HTMLButtonElement).click();
    await vi.waitFor(() => expect(root.querySelector('#diary-reader-detail')?.textContent).toContain('I felt relieved but unsure.'));
    expect(root.querySelector('#diary-reader-detail')?.textContent).toContain('Then this happened.');
    expect(root.querySelector('#diary-reader-detail .diary-ai-stale')).not.toBeNull();
    cleanup();
  });
  it('still tells the story from descriptions when narratives cannot be loaded', async () => {
    const root = fixture();
    const client = vi.fn().mockImplementation(async (path: string) => {
      if (path === '/narratives') throw new Error('not deployed');
      return path === '/check-in' ? { pending: false } : { entries: [{ id: 'a', entryDate: '2025-11-13', title: 'Start', entryKind: 'event', description: 'It began here.' }], hasMore: false };
    });
    const cleanup = mountDiaryPanel(root, client);
    await vi.waitFor(() => expect(root.querySelector('#diary-story-body')?.textContent).toContain('It began here.'));
    expect(root.querySelector('#diary-status')?.textContent).toBe('');
    cleanup();
  });
  it('accepts dates serialized as [year, month, day] arrays, as the production backend sent them', async () => {
    const root = fixture();
    const entries = [
      { id: 'b', entryDate: [2026, 10, 18], title: 'Later', category: 'relationship', entryKind: 'event', description: 'Then.' },
      { id: 'a', entryDate: [2025, 11, 3], title: 'Start', category: 'investment', entryKind: 'event', description: 'First.' },
    ];
    const client = vi.fn().mockImplementation(async (path: string) => path === '/check-in' ? { pending: false }
      : path.startsWith('/entries?') ? { entries, hasMore: false } : { ...entries[0], markdown: 'md', metadataJson: '{}' });
    const cleanup = mountDiaryPanel(root, client);
    await vi.waitFor(() => expect(root.querySelector('#diary-story-body')?.textContent).toContain('First.'));
    expect(root.querySelector('#diary-status')?.textContent).toBe('');
    expect(root.querySelector('#diary-list')?.textContent).toContain('2025-11-03');
    const story = root.querySelector('#diary-story-body')!.textContent!;
    expect(story.indexOf('First.')).toBeLessThan(story.indexOf('Then.'));
    (root.querySelector('.diary-passage') as HTMLButtonElement).click();
    await vi.waitFor(() => expect(root.querySelector('#diary-reader-title')?.textContent).toContain('2026-10-18'));
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
