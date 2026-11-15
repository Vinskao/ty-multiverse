import type { APIRoute } from 'astro';

// llms.txt convention: tells AI agents what this site is, who it is for and where the machine-readable content lives.
// Keep every sentence factual (docs/HOME_SEARCH_POSITIONING.md, docs/NORTH_STAR.md); do not add services we do not run.
export const GET: APIRoute = async ({ url }) => {
  const base = url.origin;
  const body = `# TY 市場研究室（TY Market Lab）

> 公開投資研究的統一入口：法說、財報、SEC 申報與公開研究頻道，由 AI 整理成附來源與頁碼的主張，
> 連到標的、技術、供應鏈與總體經濟。主要讀者是需要快速掌握產業、技術與總經脈絡的基金經理人與專業投資人，
> 以台股與美股、半導體與 AI 供應鏈為主。網站內容免費閱讀（首頁含廣告）。
>
> A single entry point for public investment research on Taiwan and US stocks: earnings calls, filings and public
> research channels turned into claims with source and page number, linked to tickers, technology, supply chains and
> the macro backdrop. Written for fund managers and professional investors.

## 網站提供什麼

- 研究報告主張：每項主張附原文來源、頁碼與資料日期，可依標題、來源或主張搜尋、依研究主題瀏覽，並連到相關標的、技術與供應鏈。
- 台股籌碼摘要：持有標的的股價、三大法人買賣超、融資、外資持股比率、集保股權分散（大戶／散戶持股）、
  月營收成長與毛利率變化，伺服器端輸出，每幾分鐘更新。
- 總體經濟圖表：多國重要總經資料（利率、物價、就業、貿易、匯率等），用來檢視個股所處的總經風險。
- 半導體供應鏈研究：龍頭公司年報主張與持股的對照、供應鏈與技術研究圖。

不提供策略回測、自動下單或獲利保證；內容為研究資料整理，不構成投資建議。投資決策由讀者自行判斷。

## 機器可讀內容

- [持股籌碼摘要（Markdown）](${base}/brief.md)：每檔持股的價格、法人買賣超、融資、外資持股、集保股權分散、營收成長與毛利率。
- [Holdings chip summary (English Markdown)](${base}/brief.md?lang=en)：同一份摘要的英文版。
- [持股籌碼摘要（JSON）](${base}/brief.json)：同樣資料的結構化版本。
- [網站地圖](${base}/sitemap.xml)：所有可索引的公開頁面。

## 公開頁面

- [首頁](${base}/)：研究報告搜尋、研究主題排行與籌碼摘要（伺服器端輸出）。
- [文章](${base}/work)：工程知識庫與開發紀錄（架構決策、資料整合、AI 研究與部署）。
- [API 規格](${base}/api-reference)：選用的市場資料 API 說明（價格與開放方式尚未公布）。
- [關於](${base}/about)：維護者與網站背景。
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600', 'X-Robots-Tag': 'noindex, nofollow' } });
};
