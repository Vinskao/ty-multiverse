# /palais LinkedIn 職缺

```mermaid
flowchart LR
    Panel["職缺清單與審核"] -->|Bearer token| Astro["/api/market/linkedin-jobs"]
    Astro -->|"GET 清單 / POST 核准或撤銷"| Maya["Maya Sawa"]
```

## 開發方法

1. 2026-11-19 先固定職缺面板在社群數據下方的測試。Maya Sawa 負責驗證管理者權限及保存狀態。介面處理逾時、資料載入、儲存和重新整理。
2. 讓待審核職缺可以核准、已核准職缺在被排程領取前可以撤銷。儲存後重新抓清單，避免畫面保留失效的狀態。
3. 使用既有中英文切換與顏色變數。用 `node node_modules/vitest/vitest.mjs run tests/palais tests/lang` 測位置及英文字串。

收信與投遞狀態機文件位於 Maya Sawa 的 `docs/LINKEDIN_JOBS.md`。
