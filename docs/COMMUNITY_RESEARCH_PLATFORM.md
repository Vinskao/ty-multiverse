# 共同研究平台與 AI 機會池

> **2026-11-10 更新：** 首頁不再以「一起貢獻報告」為主軸。上傳只開放擁有者，報告主要來自公開來源的自動收集，所以首頁改成「公開投資研究的統一入口」，主動作是搜尋，訪客可以來信推薦來源。決定過程、北極星指標與新流程圖見 [NORTH_STAR.md](NORTH_STAR.md)。下方流程圖中的報告庫、AI 萃取、研究圖與機會池仍然適用。

2026-11-02：首頁定位為互利共生的共同投資研究平台。社群貢獻重視的報告，AI 串接證據、技術、供應鏈與總經，形成可追蹤的研究圖與候選標的。
主動作導向報告庫與研究圖；Miner 是選用的付費市場資料 API，以預設摺疊的小型區塊呈現。
Custom 改標示為 AI 機會池，保留既有擁有者手動自選功能及權限，公開讀者不用取得管理權限。
每週 GPT 排程的後端與雲端狀態見 [GPT_WEEKLY_OPPORTUNITIES.md](../../maya-sawa/docs/GPT_WEEKLY_OPPORTUNITIES.md)。

```mermaid
flowchart LR
    Community[擁有者選擇 PDF 並上傳] --> Upload[檔名作標題，只能公開]
    Upload --> Library[公開研究報告庫]
    Library --> AI[AI 萃取證據與分析]
    Macro[總經與市場資料] --> AI
    AI --> Graph[共享研究圖]
    AI --> Candidates[持股之外的候選標的]
    Candidates --> Rating{最新分析結論為買？}
    Rating -->|是| Pool[AI 機會池]
    Graph --> People[所有參與者閱讀與判斷]
    Pool --> People
    People --> Community
    Miner[選用付費 Miner API] --> Integration[程式資料串接]
```

## 開發方法

2026-11-03：先用 2454 中立、3037 買及賣出／無分析／讀取失敗的測試確認機會池只顯示最新結論為「買」的標的；沿用既有分析結論解析器，載入及重新整理時重新篩選，儲存分析後重新載入。候選仍保留在後端，供首次分析及後續重評；未分析、無評級或無法讀取者暫不顯示，避免中立或未知標的進入機會池。這是顯示篩選，並未改寫提名或資料收集流程。憑證沿用既有配置，不新增金鑰。先跑 `node_modules/vitest/vitest.mjs run tests/market/opportunities.test.ts tests/market/analysisRating.test.ts tests/market/watchBadge.test.ts`，部署與實機驗證待 Jenkins 建置後進行；未來變更準入規則時應同時核對來源資料、失敗狀態與重新評級。

1. 先新增首頁行為契約測試，重現主要動作仍導向試用、平台精神不明與 Miner 過度醒目的現況。
2. 更新中英文 i18n 與 Astro SSR 的相同文字，避免載入時閃出舊文案。新定位取代舊版以創辦人背景為主的 hero 契約，保留 SEO、聯絡入口與語言同步測試。
3. 主動作直達既有報告庫，第二動作導向研究圖；付費 API 的 Email 留在 Miner details，使用既有聯絡工具。
4. 機會池沿用 custom 資料與 ai-watch 理由顯示，不把一般使用者變成管理者，也不把尚未啟用的排程寫成已在執行。
5. 本次不新增前端憑證。後端 agent key 維持既有安全注入，不放在頁面、任務文字或 Git。
6. 先跑聚焦測試，再跑全套 Vitest；正式 build 交給 Jenkins，部署後仍須核對桌面／手機中英文、Miner 展開收合與研究入口。

測試：以 Codex 隨附 Node 執行 `node_modules/vitest/vitest.mjs run tests/seo/communityPlatform.test.ts tests/seo/homeSeo.test.ts`。
新增／調整：共同研究主軸、Miner 次要入口、AI 機會池標籤、中英文 SSR 同步與 SEO 契約。
已知缺口：本機瀏覽器控制服務不可用，尚未做視覺驗證或正式部署。

2026-11-03 上傳流程簡化：先以報告頁測試重現多餘欄位，再讓使用者只選擇 PDF 並上傳；每份報告使用檔名作標題，只能公開，原始 PDF 仍只開放上傳者下載。頁面移除 SEC 網址匯入入口，既有後端匯入能力與歷史資料保留。認證沿用既有登入 token，沒有新增憑證。後端拒絕非公開上傳；舊有私人資料不會自動公開。先以現有上傳功能為基準執行 `node_modules/vitest/vitest.mjs run tests/market/reports.test.ts`，再由 Jenkins 建置；部署後需實際驗證單份及多份 PDF、公開可見性和下載權限。未來簡化類似流程時先確認資料可見性規則，並保留明確說明。
