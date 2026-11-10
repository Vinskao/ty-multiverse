import type { APIRoute } from 'astro';

const MAYA_SAWA_URL = process.env.MAYA_SAWA_INTERNAL_URL || import.meta.env.MAYA_SAWA_INTERNAL_URL || 'http://maya-sawa/maya-sawa';

// The links inside the subscription mails land here: /confirm and /unsubscribe, each with ?token=.
const COPY: Record<string, { done: string; title: string }> = {
  confirm: { title: '訂閱已確認', done: '之後每天會收到當日的每日市場精讀。每封信最下面都有取消訂閱連結。' },
  unsubscribe: { title: '已取消訂閱', done: '我們不會再寄每日精讀給這個地址。想再訂閱，隨時可以到網站頁尾重新填寫。' },
};

function page(title: string, body: string, status: number): Response {
  const html = `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title}｜TY 市場研究室</title><style>body{margin:0;padding:3rem 1.25rem;background:#0b0d12;color:#e6e8ee;font:16px/1.7 system-ui,sans-serif}main{max-width:34rem;margin:0 auto}a{color:#9ecbff}</style></head><body><main><h1>${title}</h1><p>${body}</p><p><a href="/">回到 TY 市場研究室</a></p></main></body></html>`;
  return new Response(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
}

async function forward(action: string, token: string, method: 'GET' | 'POST'): Promise<Response | null> {
  if (!COPY[action] || !token) return null;
  return fetch(`${MAYA_SAWA_URL}/market/subscriptions/${action}?${new URLSearchParams({ token })}`, { method, headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15000) }).catch(() => null);
}

export const GET: APIRoute = async ({ params, url }) => {
  const action = params.action ?? '';
  const response = await forward(action, url.searchParams.get('token') ?? '', 'GET');
  if (!response) return page('連結無效', '這個連結不完整，或服務暫時無法連線，請稍後再試。', COPY[action] ? 502 : 404);
  if (!response.ok) return page('連結無效', '這個連結無效或已經失效。', 404);
  return page(COPY[action].title, COPY[action].done, 200);
};

// RFC 8058 one-click unsubscribe: mail clients POST to the List-Unsubscribe link.
export const POST: APIRoute = async ({ params, url }) => {
  if (params.action !== 'unsubscribe') return new Response(null, { status: 405 });
  const response = await forward('unsubscribe', url.searchParams.get('token') ?? '', 'POST');
  return new Response(null, { status: response?.ok ? 200 : 404 });
};
