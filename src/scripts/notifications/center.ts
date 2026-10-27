import { formatNumber } from '../format/numbers';
export type SiteNotification = { id: string; title: string; body: string; href: string };
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
export function mountNotifications(root: HTMLElement, username: string, items: SiteNotification[], lang: string) {
  const get = <T extends HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
  const bell = get<HTMLButtonElement>('[data-bell]');
  const panel = get('[data-panel]');
  const badge = get('[data-count]');
  const list = get('[data-list]');
  const all = get<HTMLButtonElement>('[data-read-all]');
  const key = `tym:notifications:read:${encodeURIComponent(username)}`;
  let read: string[] = [];
  try { const saved = JSON.parse(localStorage.getItem(key) || '[]'); if (Array.isArray(saved)) read = saved.filter(x => typeof x === 'string'); } catch { /* Storage can be unavailable. */ }
  const notifications = [...new Map(items.map(item => [item.id, item])).values()];
  const abort = new AbortController();
  const signal = abort.signal;
  const close = () => { panel.hidden = true; bell.setAttribute('aria-expanded', 'false'); };
  const render = () => {
    const unread = notifications.filter(item => !read.includes(item.id)).length;
    badge.textContent = unread > 99 ? '99+' : formatNumber(unread, 'count');
    badge.hidden = unread === 0;
    bell.setAttribute('aria-label', lang === 'en' ? `Notifications, ${unread} unread` : `通知，${unread} 則未讀`);
    all.textContent = lang === 'en' ? 'Mark all read' : '全部已讀';
    all.disabled = unread === 0;
    get('[data-empty]').textContent = lang === 'en' ? 'No notifications' : '目前沒有通知';
    get('[data-empty]').hidden = notifications.length > 0;
    list.replaceChildren();
    for (const item of notifications) {
      const li = document.createElement('li');
      li.classList.toggle('unread', !read.includes(item.id));
      const link = document.createElement('a'); link.href = item.href;
      const title = document.createElement('strong'); title.textContent = item.title;
      const body = document.createElement('span'); body.textContent = item.body;
      link.append(title, body); li.append(link); list.append(li);
      link.addEventListener('click', () => { mark([item.id]); close(); }, { signal });
    }
  };
  const mark = (ids: string[]) => {
    read = [...new Set([...read, ...ids])].slice(-200);
    try { localStorage.setItem(key, JSON.stringify(read)); } catch { /* Retain session state. */ }
    render();
  };
  bell.addEventListener('click', () => { panel.hidden = !panel.hidden; bell.setAttribute('aria-expanded', String(!panel.hidden)); }, { signal });
  all.addEventListener('click', () => mark(notifications.map(item => item.id)), { signal });
  document.addEventListener('click', e => { if (!root.contains(e.target as Node)) close(); }, { signal });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) { close(); bell.focus(); } }, { signal });
  close(); render();
  return () => { abort.abort(); close(); list.replaceChildren(); badge.hidden = true; };
}
