import type { APIRoute } from 'astro';
import { getMarketBrief } from '../services/server/marketBrief';

// Agent-facing Markdown digest of the selected holdings' chip data (codes only, no account values).
// Chinese by default; ?lang=en for English.
export const GET: APIRoute = async ({ url }) => {
  const lang = url.searchParams.get('lang') === 'en' ? 'en' : 'zh';
  const markdown = await getMarketBrief<string>('md', lang);
  if (!markdown) {
    const body = lang === 'en' ? '# Holdings chip summary\n\nTemporarily unavailable; please retry shortly.\n' : '# 持股籌碼摘要\n\n資料暫時無法取得，請稍後再試。\n';
    return new Response(body, { status: 503, headers: { 'Content-Type': 'text/markdown; charset=utf-8', 'Retry-After': '30' } });
  }
  return new Response(markdown, { headers: { 'Content-Type': 'text/markdown; charset=utf-8', 'Cache-Control': 'no-cache', 'Content-Language': lang === 'en' ? 'en' : 'zh-TW' } });
};
