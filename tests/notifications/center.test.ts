import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { mountNotifications, diaryNotification } from '../../src/scripts/notifications/center';

describe('notification center', () => {
  it('places the bell after language and removes the page banner', () => {
    const nav = readFileSync('src/components/Nav.astro', 'utf8');
    const layout = readFileSync('src/layouts/BaseLayout.astro', 'utf8');
    expect(nav.indexOf('<NotificationCenter />')).toBeGreaterThan(nav.indexOf('id="langToggleBtn"'));
    expect(layout).not.toContain('<DiaryReminder />');
  });
  it('deduplicates a diary period and identifies the next one', () => {
    expect(diaryNotification({ pending: false }, 'alice')).toBeNull();
    const a = diaryNotification({ pending: true, triggeredAt: '2026-10-27' }, 'alice')!;
    expect(a.id).toBe(diaryNotification({ pending: true, triggeredAt: '2026-10-27' }, 'alice')!.id);
    expect(a.id).not.toBe(diaryNotification({ pending: true, triggeredAt: '2026-11-27' }, 'alice')!.id);
    expect(a.href).toContain('username=alice');
  });
  it('counts unread, marks read on action, persists and closes on Escape', () => {
    const saved = new Map<string, string>();
    vi.spyOn(localStorage, 'getItem').mockImplementation(key => saved.get(key) ?? null);
    vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => { saved.set(key, value); });
    document.body.innerHTML = `<div id="center"><button data-bell></button><span data-count></span><section data-panel hidden><button data-read-all></button><ul data-list></ul><p data-empty></p></section></div>`;
    const root = document.querySelector<HTMLElement>('#center')!;
    const item = { id: 'a', title: 'Reminder', body: 'Due', href: '#diary' };
    const mount = () => mountNotifications(root, 'alice', [item, item], 'zh');
    let cleanup = mount();
    expect(root.querySelector('[data-count]')!.textContent).toBe('1');
    root.querySelector<HTMLButtonElement>('[data-bell]')!.click();
    expect(root.querySelector<HTMLElement>('[data-panel]')!.hidden).toBe(false);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(root.querySelector<HTMLElement>('[data-panel]')!.hidden).toBe(true);
    root.querySelector<HTMLButtonElement>('[data-read-all]')!.click();
    expect(root.querySelector<HTMLElement>('[data-count]')!.hidden).toBe(true);
    cleanup(); cleanup = mount();
    expect(root.querySelector<HTMLElement>('[data-count]')!.hidden).toBe(true);
    cleanup();
    const other = mountNotifications(root, 'bob', [item], 'en');
    expect(root.querySelector('[data-count]')!.textContent).toBe('1');
    root.querySelector<HTMLAnchorElement>('a')!.click();
    expect(root.querySelector<HTMLElement>('[data-count]')!.hidden).toBe(true);
    other();
  });
});
