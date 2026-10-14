import type { APIRoute } from 'astro';
import { getMarketBrief } from '../services/server/marketBrief';

// Agent-facing Markdown digest of the selected holdings' chip data (codes only, no account values).
export const GET: APIRoute = async () => {
  const markdown = await getMarketBrief<string>('md');
  if (!markdown) return new Response('# 持股籌碼摘要\n\n資料暫時無法取得，請稍後再試。\n', { status: 503, headers: { 'Content-Type': 'text/markdown; charset=utf-8', 'Retry-After': '30' } });
  return new Response(markdown, { headers: { 'Content-Type': 'text/markdown; charset=utf-8', 'Cache-Control': 'no-cache' } });
};
