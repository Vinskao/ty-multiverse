import { GATEWAY_API_BASE } from '../../common/constants/api';
import { hasPalaisCheckerRole } from '../navigation/menu';

const copy = {
  heading: ['Account settings', '帳號設定'],
  access: ['Palais access and review', 'Palais 存取與審核權'],
  reason: ['Application reason', '申請理由'],
  apply: ['Apply for access and review rights', '申請存取與審核權'],
  busy: ['Working…', '處理中…'],
  conflict: ['The application changed. The list has been refreshed.', '申請已更新，已重新載入清單。'],
  unavailable: ['Palais access is temporarily unavailable.', 'Palais 權限服務暫時無法使用。'],
  error: ['Request failed. Refresh to try again.', '操作失敗，請重新整理後再試。'],
  login: ['Sign in to manage Palais access.', '請登入後管理 Palais 權限。'],
  queue: ['Pending applications', '待審申請'],
  history: ['My applications', '我的申請'],
  empty: ['No pending applications.', '目前沒有待審申請。'],
  approve: ['Approve', '放行'],
  confirm: ['Grant Palais access and review rights to this account?', '授予此帳號 Palais 存取與審核權？'],
  reject: ['Reject', '拒絕'],
  rejectReason: ['Rejection reason', '拒絕理由'],
  withdraw: ['Withdraw', '撤回'],
  retry: ['Retry synchronization', '重試同步'],
  revoke: ['Revoke access', '撤銷權限'],
  revokeConfirm: ['Revoke Palais access and review rights?', '撤銷 Palais 存取與審核權？'],
  audit: ['Review audit', '審核紀錄'],
  managed: ['Manage Palais access', '管理 Palais 權限'],
  SUBMIT: ['Submitted', '已送件'],
  APPROVE: ['Approved', '已放行'],
  REJECT: ['Rejected', '已拒絕'],
  WITHDRAW: ['Withdrawn', '已撤回'],
  ACTIVATE: ['Activated', '已開通'],
  REVOKE: ['Revoked', '已撤銷'],
  RETRY: ['Retry requested', '已要求重試'],
  SYNC_RETRY: ['Synchronization retry', '權限同步重試'],
  SYNC_FAILED: ['Synchronization failed', '權限同步失敗'],
  APPROVAL_INVALIDATED: ['Approval invalidated', '放行已失效'],
  prev: ['Previous', '上一頁'],
  next: ['Next', '下一頁'],
  refresh: ['Refresh status', '刷新狀態'],
  relogin: ['Sign in again to load your new permissions.', '請重新登入以載入新權限。'],
  PENDING: ['Pending', '待審核'],
  SYNCING: ['Synchronizing', '權限同步中'],
  ACTIVE: ['Active', '已開通'],
  REJECTED: ['Rejected', '已拒絕'],
  WITHDRAWN: ['Withdrawn', '已撤回'],
  FAILED: ['Synchronization failed', '同步失敗'],
  REVOKED: ['Revoked', '已撤銷'],
} as const;

type CopyKey = keyof typeof copy;
type Application = {
  id: string; status: CopyKey; display_name: string; reason: string;
  created_at: string; approvals: number; approvals_required: number; rejection?: string;
};
type Audit = {
  request_id: string; actor: string; action: CopyKey; display_name: string;
  created_at: string; status: CopyKey; detail?: string;
};
type Access = { checker: boolean; administrator: boolean; canDecide: boolean; requests: Application[] };
class AccessError extends Error {
  constructor(readonly status: number) { super('Palais access request failed'); }
}
const activeStatuses = new Set(['PENDING', 'SYNCING', 'FAILED']);

export function initPalaisAccountSettings(): void {
  const status = document.querySelector<HTMLElement>('#access-status');
  const form = document.querySelector<HTMLFormElement>('#access-apply');
  const reason = document.querySelector<HTMLTextAreaElement>('#access-reason');
  const requests = document.querySelector<HTMLElement>('#access-requests');
  const queue = document.querySelector<HTMLElement>('#access-queue');
  const audit = document.querySelector<HTMLElement>('#access-audit');
  if (!status || !form || !reason || !requests || !queue || !audit || status.dataset.bound) return;
  status.dataset.bound = 'true';
  let current: Access | undefined;
  let pending: Application[] = [];
  let events: Audit[] = [];
  let managed: Application[] = [];
  let queueOffset = 0;
  let auditOffset = 0;
  let managedOffset = 0;
  const controller = new AbortController();

  function t(key: CopyKey): string {
    const lang = document.documentElement.lang || localStorage.getItem('site_language') || 'en';
    return copy[key]?.[lang.startsWith('zh') ? 1 : 0] ?? key;
  }

  function paragraph(value: string): HTMLElement {
    const p = document.createElement('p');
    p.textContent = value;
    return p;
  }

  function heading(key: CopyKey): HTMLElement {
    const title = document.createElement('h3');
    title.textContent = t(key);
    return title;
  }

  function button(key: CopyKey, action: () => void): HTMLButtonElement {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'access-action';
    el.textContent = t(key);
    el.addEventListener('click', action);
    return el;
  }

  async function request<T>(path: string, payload?: object): Promise<T> {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No session');
    const response = await fetch(GATEWAY_API_BASE + '/palais-access' + path, {
      method: payload ? 'POST' : 'GET',
      headers: { Authorization: 'Bearer ' + token, ...(payload && { 'Content-Type': 'application/json' }) },
      body: payload ? JSON.stringify(payload) : undefined,
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(30000)]),
      cache: 'no-store',
    });
    if (!response.ok) throw new AccessError(response.status);
    return (response.headers.get('content-type')?.includes('application/json') ? await response.json() : undefined) as T;
  }

  async function load(): Promise<void> {
    current = await request<Access>('/me');
    [pending, events, managed] = await Promise.all([
      current.checker ? request<Application[]>('/review-queue?offset=' + queueOffset) : [],
      current.administrator ? request<Audit[]>('/audit?offset=' + auditOffset) : [],
      current.administrator ? request<Application[]>('/managed-requests?offset=' + managedOffset) : [],
    ]);
    render();
  }

  async function run(action: () => Promise<void>): Promise<void> {
    if (!status || status.getAttribute('aria-busy') === 'true') return;
    const buttons = form!.closest('section')!.querySelectorAll<HTMLButtonElement>('button');
    buttons.forEach(el => { el.disabled = true; });
    status.setAttribute('aria-busy', 'true');
    status.textContent = t('busy');
    try {
      await action();
      status.textContent = '';
    } catch (error) {
      const code = error instanceof AccessError ? error.status : 0;
      if (code === 401) {
        window.location.assign('/login?redirect=%2Faccount-settings');
        return;
      }
      if (code === 409) {
        try {
          await load();
          status.textContent = t('conflict');
        } catch {
          status.textContent = t('error');
        }
        return;
      }
      status.textContent = t(code === 503 || code === 404 ? 'unavailable' : 'error');
      if (!current) status.append(' ', button('refresh', () => void run(load)));
    } finally {
      status.setAttribute('aria-busy', 'false');
      buttons.forEach(el => { el.disabled = false; });
    }
  }

  function decide(id: string, action: string, payload: object = {}): void {
    void run(async () => {
      await request('/requests/' + encodeURIComponent(id) + '/' + action, payload);
      reason!.value = '';
      await load();
    });
  }

  function card(row: Application): HTMLElement {
    const article = document.createElement('article');
    article.className = 'access-request';
    article.append(paragraph(t(row.status) + ' · ' + row.approvals + '/' + row.approvals_required),
      paragraph(row.display_name + ' · ' + new Date(row.created_at).toLocaleString()),
      paragraph(row.reason));
    if (row.rejection) article.append(paragraph(t('rejectReason') + ' · ' + row.rejection));
    return article;
  }

  function render(): void {
    document.querySelectorAll<HTMLElement>('[data-copy]').forEach(element => {
      element.textContent = t(element.dataset.copy as CopyKey);
    });
    if (!current || !form || !requests || !queue || !audit) return;
    form.hidden = current.checker || current.requests.some(row => activeStatuses.has(row.status));
    requests.replaceChildren(heading('history'), button('refresh', () => void run(load)));
    for (const row of current.requests) {
      const item = card(row);
      if (row.status === 'PENDING') item.append(button('withdraw', () => decide(row.id, 'withdraw')));
      requests.append(item);
    }
    if (current.checker && !hasPalaisCheckerRole(localStorage.getItem('token'))) {
      const login = document.createElement('a');
      login.href = '/login?redirect=%2Faccount-settings';
      login.textContent = t('relogin');
      requests.append(login);
    }
    queue.replaceChildren();
    if (current.checker) {
      queue.append(heading('queue'));
      if (!pending.length) queue.append(paragraph(t('empty')));
      for (const row of pending) {
        const item = card(row);
        if (current.canDecide) item.append(button('approve', () => {
          if (window.confirm(t('confirm'))) decide(row.id, 'approve');
        }), button('reject', () => {
          const note = window.prompt(t('rejectReason'));
          if (note?.trim()) decide(row.id, 'reject', { reason: note });
        }));
        queue.append(item);
      }
      if (queueOffset > 0) queue.append(button('prev', () => { queueOffset -= 30; void run(load); }));
      if (pending.length === 30) queue.append(button('next', () => { queueOffset += 30; void run(load); }));
    }
    audit.replaceChildren();
    if (current.administrator) {
      audit.append(heading('managed'));
      for (const row of managed) {
        const item = card(row);
        if (row.status === 'FAILED') item.append(button('retry', () => decide(row.id, 'retry')));
        if (row.status === 'ACTIVE') item.append(button('revoke', () => {
          if (window.confirm(t('revokeConfirm'))) decide(row.id, 'revoke');
        }));
        audit.append(item);
      }
      if (managedOffset > 0) audit.append(button('prev', () => { managedOffset -= 30; void run(load); }));
      if (managed.length === 30) audit.append(button('next', () => { managedOffset += 30; void run(load); }));
      audit.append(heading('audit'));
      for (const entry of events) {
        const item = document.createElement('article');
        item.className = 'access-request';
        item.append(paragraph(entry.display_name + ' · ' + t(entry.action) + ' · ' + new Date(entry.created_at).toLocaleString()),
          paragraph(entry.actor));
        if (entry.detail) item.append(paragraph(entry.detail));
        audit.append(item);
      }
      if (auditOffset > 0) audit.append(button('prev', () => { auditOffset -= 50; void run(load); }));
      if (events.length === 50) audit.append(button('next', () => { auditOffset += 50; void run(load); }));
    }
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    void run(async () => {
      await request('/requests', { reason: reason.value });
      reason.value = '';
      await load();
    });
  });
  const language = new MutationObserver(render);
  language.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  document.addEventListener('astro:before-swap', () => { controller.abort(); language.disconnect(); }, { once: true });
  render();
  if (localStorage.getItem('token')) void run(load);
  else {
    const login = document.createElement('a');
    login.href = '/login?redirect=%2Faccount-settings';
    login.textContent = t('login');
    status.append(login);
  }
}
