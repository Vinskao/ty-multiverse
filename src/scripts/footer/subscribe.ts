// Footer sign-up for the daily reading by email. The server stores the address as pending and mails a
// confirmation link; nothing is sent to an address until that link is opened.

export function initSubscribeForm(
  doc: Document = document,
  fetcher: (url: string, init: RequestInit) => Promise<Response> = (url, init) => fetch(url, init),
): void {
  const form = doc.getElementById('footer-subscribe') as HTMLFormElement | null;
  if (!form || form.dataset.bound) return;
  form.dataset.bound = 'true';
  const status = doc.getElementById('footer-subscribe-status');
  const say = (text: string) => { if (status) status.textContent = text; };
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const input = form.querySelector<HTMLInputElement>('input[name="email"]');
    const email = (input?.value ?? '').trim();
    if (!email) return;
    const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (button) button.disabled = true;
    fetcher('/api/market/subscriptions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })
      .then((response) => {
        if (response.ok) { say('已收到。請到信箱點確認連結，確認後才會開始每天寄送。'); if (input) input.value = ''; return; }
        say(response.status === 422 ? '這個 Email 地址格式不正確。'
          : response.status === 429 ? '今天的訂閱申請已達上限，請明天再試。'
          : '訂閱暫時無法送出，請稍後再試。');
      })
      .catch(() => say('訂閱暫時無法送出，請稍後再試。'))
      .finally(() => { if (button) button.disabled = false; });
  });
}
