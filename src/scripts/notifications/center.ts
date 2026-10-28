import { formatNumber } from '../format/numbers';
import { notificationPanelLayout } from './layout';
export type SiteNotification = { id: string; title: string; body: string; href: string; at?: string; attention?: boolean };
export type RoutineRow = { id: number; kind: string; title: string; body: string; createdAt: string };

/** A message the scheduled routines sent to Telegram, kept by the backend so it can be re-read here. */
export function routineNotification(row: RoutineRow, _lang = 'zh'): SiteNotification {
  return { id: `routine:${row.id}`, title: row.title, body: row.body, href: '', at: row.createdAt, attention: row.kind === 'attention' };
}

export type RoutineHistory = { items: SiteNotification[]; status: 'ok' | 'forbidden' | 'unavailable' };

/** Owner-only: anyone else (or an unreachable backend) simply has no routine messages, and `status` says which. */
export async function loadRoutineHistory(token: string, lang = 'zh', request: typeof fetch = fetch, base = ''): Promise<RoutineHistory> {
  try {
    const response = await request(`${base.replace(/\/$/, '')}/api/market/notifications?limit=100`, { cache: 'no-store', headers: { Authorization: `Bearer ${token}` } });
    if (response.status === 401 || response.status === 403) return { items: [], status: 'forbidden' };
    if (!response.ok) return { items: [], status: 'unavailable' };
    const payload = await response.json() as { notifications?: RoutineRow[] };
    return { items: (payload.notifications ?? []).map(row => routineNotification(row, lang)), status: 'ok' };
  } catch { return { items: [], status: 'unavailable' }; }
}

export async function fetchRoutineNotifications(token: string, lang = 'zh', request: typeof fetch = fetch, base = ''): Promise<SiteNotification[]> {
  return (await loadRoutineHistory(token, lang, request, base)).items;
}

type DiaryCheck = { pending: boolean; triggeredAt?: string | null; nextDueAt?: string };
export type Collected = { items: SiteNotification[]; empty: 'signed-out' | 'forbidden' | 'unavailable' | 'none' };

/** Everything the bell lists, and why it is empty when it is. Routine messages (owner only, from the backend) need just the token;
 *  the diary reminder also needs a username. One failing source never hides the other. */
export async function collectNotifications(options: { token: string | null; username: string; lang: string; request?: typeof fetch; base?: string;
                                                      getDiary: () => Promise<DiaryCheck> }): Promise<Collected> {
  const { token, username, lang } = options;
  if (!token) return { items: [], empty: 'signed-out' };
  const history = loadRoutineHistory(token, lang, options.request ?? fetch, options.base ?? '');
  let diary: SiteNotification | null = null;
  if (username) {
    try { diary = diaryNotification(await options.getDiary(), username, lang); } catch { /* the diary check may fail on its own */ }
  }
  const routine = await history;
  const items = [...(diary ? [diary] : []), ...routine.items];
  return { items, empty: items.length ? 'none' : routine.status === 'ok' ? 'none' : routine.status };
}

/** The empty-state line: an empty bell must say whether you are signed out, not the owner, or the history is unreachable. */
export function emptyNotice(reason: Collected['empty'], lang: string): string {
  const en = lang === 'en';
  if (reason === 'signed-out') return en ? 'Sign in to see your notifications' : '登入後才會顯示通知（排程訊息只有擁有者看得到）';
  if (reason === 'forbidden') return en ? 'This account cannot read scheduled-run messages' : '這個帳號沒有讀取排程通知的權限';
  if (reason === 'unavailable') return en ? 'Notifications are temporarily unavailable' : '通知暫時無法載入，稍後再試';
  return en ? 'No notifications' : '目前沒有通知';
}

/** Taipei wall-clock "MM/DD HH:mm" so the time matches the Telegram message the owner saw. */
export function taipeiStamp(iso: string): string {
  const date = new Date(new Date(iso).getTime() + 8 * 3600000);
  if (Number.isNaN(date.getTime())) return '';
  const two = (n: number) => String(n).padStart(2, '0');
  return `${two(date.getUTCMonth() + 1)}/${two(date.getUTCDate())} ${two(date.getUTCHours())}:${two(date.getUTCMinutes())}`;
}
export function diaryNotification(result: { pending: boolean; triggeredAt?: string | null; nextDueAt?: string }, username: string, lang = 'zh'): SiteNotification | null {
  if (!result.pending) return null;
  return {
    id: `diary:${result.triggeredAt || result.nextDueAt || 'pending'}`,
    title: lang === 'en' ? 'Diary review due' : '日記整理到期',
    body: lang === 'en' ? 'Generate Markdown in the original conversation on your phone, then import it here.' : '請到手機原對話產生 MD，再回來匯入。',
    href: `/tymultiverse/palais/?${new URLSearchParams({ username })}#private-diary`,
  };
}

/** Read receipts are scoped to the signed-in account and never contain diary content. */
export function mountNotifications(root: HTMLElement, username: string, items: SiteNotification[], lang: string, emptyText?: string) {
  const get = <T extends HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
  const bell = get<HTMLButtonElement>('[data-bell]');
  const panel = get('[data-panel]');
  const badge = get('[data-count]');
  const list = get('[data-list]');
  const all = get<HTMLButtonElement>('[data-read-all]');
  const closeButton = root.querySelector<HTMLButtonElement>('[data-close]');
  const tabs = [...root.querySelectorAll<HTMLButtonElement>('[data-tab]')];
  let filter: 'all' | 'unread' = 'all';
  const open = new Set<string>();
  const key = `tym:notifications:read:${encodeURIComponent(username)}`;
  let read: string[] = [];
  try { const saved = JSON.parse(localStorage.getItem(key) || '[]'); if (Array.isArray(saved)) read = saved.filter(x => typeof x === 'string'); } catch { /* Storage can be unavailable. */ }
  const notifications = [...new Map(items.map(item => [item.id, item])).values()];
  const abort = new AbortController();
  const signal = abort.signal;
  const positionPanel = () => {
    if (panel.hidden) return;
    const anchor = bell.getBoundingClientRect();
    const viewport = { width: document.documentElement.clientWidth || window.innerWidth, height: window.innerHeight };
    let placement = notificationPanelLayout(anchor, viewport, panel.getBoundingClientRect().height);
    panel.style.width = `${placement.width}px`;
    panel.style.maxHeight = `${placement.maxHeight}px`;
    // Re-measure after constraining the width/height so an upward-opening panel hugs its bell.
    placement = notificationPanelLayout(anchor, viewport, panel.getBoundingClientRect().height);
    panel.style.left = `${placement.left}px`;
    panel.style.top = `${placement.top}px`;
  };
  const close = () => {
    if (!panel.hidden) panel.hidePopover?.();
    panel.hidden = true;
    bell.setAttribute('aria-expanded', 'false');
  };
  const render = () => {
    const unread = notifications.filter(item => !read.includes(item.id)).length;
    badge.textContent = unread > 99 ? '99+' : formatNumber(unread, 'count');
    badge.hidden = unread === 0;
    bell.setAttribute('aria-label', lang === 'en' ? `Notifications, ${unread} unread` : `通知，${unread} 則未讀`);
    all.textContent = lang === 'en' ? 'Mark all read' : '全部已讀';
    all.disabled = unread === 0;
    closeButton?.setAttribute('aria-label', lang === 'en' ? 'Close notifications' : '關閉通知');
    const shown = filter === 'unread' ? notifications.filter(item => !read.includes(item.id)) : notifications;
    for (const tab of tabs) {
      const unreadTab = tab.dataset.tab === 'unread';
      tab.textContent = `${unreadTab ? (lang === 'en' ? 'Unread' : '未讀') : (lang === 'en' ? 'All' : '全部')} ${unreadTab ? unread : notifications.length}`;
      tab.setAttribute('aria-pressed', String((tab.dataset.tab as string) === filter));
    }
    const empty = get('[data-empty]');
    empty.textContent = filter === 'unread' && notifications.length ? (lang === 'en' ? 'Nothing unread' : '沒有未讀通知') : (emptyText ?? (lang === 'en' ? 'No notifications' : '目前沒有通知'));
    empty.hidden = shown.length > 0;
    const emptyState = root.querySelector<HTMLElement>('[data-empty-state]');
    if (emptyState) emptyState.hidden = shown.length > 0;
    list.replaceChildren();
    for (const item of shown) {
      const li = document.createElement('li');
      li.classList.toggle('unread', !read.includes(item.id));
      li.classList.toggle('read', read.includes(item.id));
      li.classList.toggle('attention', Boolean(item.attention));
      const title = document.createElement('strong'); title.textContent = item.title;
      const stamp = item.at ? taipeiStamp(item.at) : '';
      const time = stamp ? Object.assign(document.createElement('time'), { textContent: stamp, dateTime: item.at }) : null;
      const body = document.createElement('span'); body.className = 'n-body'; body.textContent = item.body;
      if (item.href) {
        const link = document.createElement('a'); link.href = item.href;
        link.append(title, ...(time ? [time] : []), body); li.append(link);
        link.addEventListener('click', () => { mark([item.id]); close(); }, { signal });
      } else {
        const toggle = document.createElement('button'); toggle.type = 'button';
        const expanded = open.has(item.id);
        toggle.setAttribute('aria-expanded', String(expanded));
        li.classList.toggle('expanded', expanded);
        toggle.append(title, ...(time ? [time] : []), body); li.append(toggle);
        toggle.addEventListener('click', () => { if (open.has(item.id)) open.delete(item.id); else open.add(item.id); mark([item.id]); }, { signal });
      }
      list.append(li);
    }
    positionPanel();
  };
  const mark = (ids: string[]) => {
    read = [...new Set([...read, ...ids])].slice(-200);
    try { localStorage.setItem(key, JSON.stringify(read)); } catch { /* Retain session state. */ }
    render();
  };
  bell.addEventListener('click', () => {
    if (!panel.hidden) { close(); return; }
    panel.hidden = false;
    // Native top layer escapes the nav's overflow clipping and stacking contexts.
    panel.showPopover?.();
    bell.setAttribute('aria-expanded', 'true');
    positionPanel();
  }, { signal });
  closeButton?.addEventListener('click', () => { close(); bell.focus(); }, { signal });
  all.addEventListener('click', () => mark(notifications.map(item => item.id)), { signal });
  for (const tab of tabs) tab.addEventListener('click', () => { filter = tab.dataset.tab === 'unread' ? 'unread' : 'all'; render(); }, { signal });
  document.addEventListener('click', e => { if (!root.contains(e.target as Node)) close(); }, { signal });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) { close(); bell.focus(); } }, { signal });
  window.addEventListener('resize', positionPanel, { signal });
  document.addEventListener('scroll', positionPanel, { signal, capture: true });
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(positionPanel) : null;
  observer?.observe(panel);
  close(); render();
  return () => { abort.abort(); observer?.disconnect(); close(); list.replaceChildren(); badge.hidden = true; };
}
