import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { mountNotifications, diaryNotification, routineNotification, fetchRoutineNotifications, collectNotifications, emptyNotice } from '../../src/scripts/notifications/center';

describe('which notifications the bell collects', () => {
  // 2026-10-28: the owner was signed in (token) but no username was stored, and the bell stayed empty because the whole
  // loader returned early without a username. Routine messages need only the token.
  const row = { id: 7, kind: 'update', title: '台股收盤後', body: '3008 賣→買', createdAt: '2026-10-27T13:25:00+00:00' };
  const history = (status = 200) => vi.fn(async () => new Response(JSON.stringify({ notifications: [row] }), { status }));
  const diary = { pending: true, triggeredAt: '2026-10-27', nextDueAt: '2026-11-27' };

  it('shows the routine messages to a signed-in owner even when no username is stored, and skips the diary then', async () => {
    const getDiary = vi.fn(async () => diary);
    const items = await collectNotifications({ token: 'tok', username: '', lang: 'zh', request: history() as any, getDiary });
    expect(items.items.map(item => item.id)).toEqual(['routine:7']);
    expect(getDiary).not.toHaveBeenCalled();
  });

  it('puts the diary reminder first when there is a username, and a failing diary check does not hide the routine messages', async () => {
    const both = await collectNotifications({ token: 'tok', username: 'alice', lang: 'zh', request: history() as any, getDiary: async () => diary });
    expect(both.items.map(item => item.id)).toEqual([`diary:2026-10-27`, 'routine:7']);
    const failing = await collectNotifications({ token: 'tok', username: 'alice', lang: 'zh', request: history() as any, getDiary: async () => { throw new Error('down'); } });
    expect(failing.items.map(item => item.id)).toEqual(['routine:7']);
  });

  it('collects nothing, and calls nothing, without a token', async () => {
    const request = history();
    expect(await collectNotifications({ token: null, username: 'alice', lang: 'zh', request: request as any, getDiary: async () => diary })).toEqual({ items: [], empty: 'signed-out' });
    expect(request).not.toHaveBeenCalled();
  });
});

describe('why the bell is empty', () => {
  // 2026-10-28: an empty bell said only "no notifications", so a signed-out owner could not tell it from "nothing was sent".
  const reply = (status: number, body: unknown = {}) => vi.fn(async () => new Response(JSON.stringify(body), { status }));
  const diary = async () => ({ pending: false });

  it('names the reason: not signed in, not the owner, or the history is unreachable', async () => {
    const ask = (request: any, token: string | null = 'tok') => collectNotifications({ token, username: '', lang: 'zh', request, getDiary: diary });
    expect((await ask(reply(200), null)).empty).toBe('signed-out');
    expect((await ask(reply(403))).empty).toBe('forbidden');
    expect((await ask(reply(401))).empty).toBe('forbidden');
    expect((await ask(reply(503))).empty).toBe('unavailable');
    expect((await ask(vi.fn(async () => { throw new Error('offline'); }))).empty).toBe('unavailable');
    expect((await ask(reply(200, { notifications: [] }))).empty).toBe('none');          // signed in as the owner, genuinely nothing yet
  });

  it('words each reason, and shows it in the panel instead of "no notifications"', () => {
    expect(emptyNotice('signed-out', 'zh')).toContain('登入');
    expect(emptyNotice('forbidden', 'zh')).toContain('權限');
    expect(emptyNotice('unavailable', 'en')).toContain('unavailable');
    expect(emptyNotice('none', 'zh')).toBe('目前沒有通知');
    document.body.innerHTML = `<div id="c"><button data-bell></button><span data-count></span><section data-panel hidden><button data-tab="all"></button><button data-tab="unread"></button><button data-read-all></button><ul data-list></ul><p data-empty></p></section></div>`;
    const root = document.querySelector<HTMLElement>('#c')!;
    const cleanup = mountNotifications(root, 'owner', [], 'zh', emptyNotice('signed-out', 'zh'));
    expect(root.querySelector('[data-empty]')!.textContent).toContain('登入');
    cleanup();
  });
});

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

  it('turns a stored routine message into a notification that keeps its text and time', () => {
    const row = { id: 12, kind: 'update', title: '市場 AI 分析｜台股收盤後', body: '3008 賣→買：營收年增轉正', createdAt: '2026-10-27T13:25:50+00:00' };
    const item = routineNotification(row, 'zh');
    expect(item).toMatchObject({ id: 'routine:12', title: '市場 AI 分析｜台股收盤後', body: row.body, href: '', at: row.createdAt, attention: false });
    expect(routineNotification({ ...row, kind: 'attention' }, 'en').attention).toBe(true);
  });

  it('reads the history only for the owner and returns nothing for anyone else', async () => {
    const row = { id: 1, kind: 'update', title: 't', body: 'b', createdAt: '2026-10-27T13:25:50+00:00' };
    const ok = vi.fn(async () => new Response(JSON.stringify({ notifications: [row] }), { status: 200 }));
    expect((await fetchRoutineNotifications('tok', 'zh', ok as any)).map(item => item.id)).toEqual(['routine:1']);
    expect(ok.mock.calls[0][1]).toMatchObject({ headers: { Authorization: 'Bearer tok' } });
    for (const status of [401, 403, 503]) expect(await fetchRoutineNotifications('tok', 'zh', (async () => new Response('{}', { status })) as any)).toEqual([]);
    expect(await fetchRoutineNotifications('tok', 'zh', (async () => { throw new Error('offline'); }) as any)).toEqual([]);
  });

  it('keeps read messages in the list, expands the full text and filters unread', () => {
    const saved = new Map<string, string>([['tym:notifications:read:alice', JSON.stringify(['routine:1'])]]);
    vi.spyOn(localStorage, 'getItem').mockImplementation(key => saved.get(key) ?? null);
    vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => { saved.set(key, value); });
    document.body.innerHTML = `<div id="center"><button data-bell></button><span data-count></span><section data-panel hidden><button data-tab="unread"></button><button data-tab="all"></button><button data-read-all></button><ul data-list></ul><p data-empty></p></section></div>`;
    const root = document.querySelector<HTMLElement>('#center')!;
    const long = '3008 賣→買：營收年增轉正\n另有 2 筆目標價';
    const items = [
      { id: 'routine:2', title: '新的', body: long, href: '', at: '2026-10-27T13:25:50+00:00', attention: false },
      { id: 'routine:1', title: '看過的', body: '舊內容', href: '', at: '2026-10-26T13:25:50+00:00', attention: true },
    ];
    const cleanup = mountNotifications(root, 'alice', items, 'zh');
    const rows = () => [...root.querySelectorAll('li')];
    expect(rows().map(li => li.classList.contains('unread'))).toEqual([true, false]);
    expect(rows()[1].textContent).toContain('舊內容');                       // the read one is still readable
    expect(rows()[0].querySelector('time')!.textContent).toBe('10/27 21:25'); // Taipei time
    expect(rows()[1].classList.contains('attention')).toBe(true);
    root.querySelector<HTMLButtonElement>('[data-tab="unread"]')!.click();
    expect(rows().map(li => li.textContent)).toEqual([expect.stringContaining('新的')]);
    root.querySelector<HTMLButtonElement>('[data-tab="all"]')!.click();
    const first = root.querySelector<HTMLButtonElement>('li button')!;
    expect(first.getAttribute('aria-expanded')).toBe('false');
    first.click();                                                          // opening a message reads it
    expect(root.querySelector('li button')!.getAttribute('aria-expanded')).toBe('true');
    expect(root.querySelector('[data-count]')!.hidden).toBe(true);
    expect(JSON.parse(saved.get('tym:notifications:read:alice')!)).toContain('routine:2');
    cleanup();
  });
});
