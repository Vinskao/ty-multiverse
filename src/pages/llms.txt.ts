import type { APIRoute } from 'astro';

// llms.txt convention: tells AI agents where the machine-readable content lives.
export const GET: APIRoute = async ({ url }) => {
  const base = `${url.origin}/tymultiverse`;
  const body = `# TY Multiverse

> Personal dashboard of TY (Java backend engineer). The home page includes a daily Taiwan-market chip summary
> (籌碼摘要) for the instruments currently held. Holdings are listed by code only; no quantities, cost, P/L or
> account values are published.

## Market

- [持股籌碼摘要 (Markdown)](${base}/brief.md): prices, institutional net buying, margin, foreign holding, TDCC holder
  distribution, revenue growth and margin changes for each held stock. Regenerated every few minutes.
- [持股籌碼摘要 (JSON)](${base}/brief.json): same data, structured.
- [Home page](${base}): the summary is server-rendered in the "籌碼摘要" section near the top.
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
};
