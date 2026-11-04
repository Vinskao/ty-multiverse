# 學習中心：領域與考試架構

```mermaid
flowchart TD
  Learn[學習中心] --> English[英文]
  English --> TOEIC[多益 TOEIC]
  TOEIC --> Quiz[既有文法、短文、閱讀練習]
  Learn --> Macro[總體經濟：通膨、利率、就業、貿易]
  Macro --> Maya[市場快報與 Maya 精讀]
  Learn --> Micro[個體經濟：供需、財報、產業]
  Micro --> Semiconductor[半導體：規劃中]
  Learn --> OOP[物件導向：繼承、多型、介面、SOLID]
  Macro --> Plan[考試範圍規劃中]
  Micro --> Plan
  OOP --> Plan
  Quiz --> API[既有 Learn API 與作答紀錄]
```

## 開發方法

側欄依既有 `learnCatalog` 產生英文、總體經濟、個體經濟與物件導向；選取分類時只顯示對應的課程，半導體只顯示該規劃項目，Maya 則開啟既有音訊畫面。先以目錄測試固定半導體為規劃中，再檢查選單歸屬及隱藏樣式；沿用原登入 token 與公開音訊 API。先在本機以 `node_modules/vitest/vitest.mjs run tests/learn` 驗證，經 Jenkins 部署後需再檢查桌面及手機切換。沒有新增題庫或半導體教材；新增教材時應先定義來源和可用狀態。

1. 檢查正式 `/learn/`，發現側欄題目清單被全域導覽樣式排成橫向，造成裁切；先新增單欄回歸測試，並以既有 TOEIC ID 與未知 ID 測試題庫分類。
2. 依首頁總經與股票資料、`/work/` 的繼承多型、抽象類別與介面、SOLID、Java 存取修飾詞訂出第一批主題。新增獨立目錄資料，規劃中的主題只連參考資料，不建立題庫、題目或測驗 API。既有多益主題仍由後端載入，維持作答、續寫、歷史與權限流程。未識別的新題庫保留在其他練習，不因分類遺失。
3. 修正側欄為明確的單欄 grid，並加入響應式領域卡與回總覽入口。既有登入 token 與訪客識別沿用原本請求流程，不新增憑證。
4. 先以 Codex 隨附 Node 執行 `node_modules/vitest/vitest.mjs run tests/learn` 作本機基準；部署需透過 Jenkins 建置。上線後檢查桌面／手機、語言切換、TOEIC 續寫與作答；目前未在正式環境部署。未來新增真實課程時，先定義後端題庫 ID 與目錄對應並測試未知及空題庫，切勿將規劃中標為已開放。



## Learn sidebar navigation

多益的「開始練習」會在登入且題庫載入後開啟第一個多益主題；未登入則顯示登入提示。Maya 音訊清單在每次 Astro 頁面切換完成後重新讀取，避免回到 Learn 時播放器空白。2026-11-04 驗證正式音訊清單回傳四筆，第一筆音檔的 HEAD 請求回傳 200、`audio/mpeg`；後端原始題庫檔案仍存在。測試 `node_modules/vitest/vitest.mjs run tests/learn`（19 passed）；部署後仍需實際登入確認完整作答和瀏覽器播放。

側欄的四個分類按鈕使用單欄排列；只有選取某分類時，才展開該分類的多益題目、Maya 或半導體次選單。`learn.css` 明確覆寫全站 `nav` 的桌面三欄與 sticky 設定，避免側欄文字重疊；回總覽會收起次選單。回歸檢查：`node_modules/vitest/vitest.mjs run tests/learn`。

```mermaid
flowchart LR
  A[TOEIC topic selected] --> B[Existing quiz session]
  C[Maya briefing selected] --> D[Audio-only view]
  D --> G[Each audio controls its own silent presenter sequence]
  G --> L[reporter.mp4 then reporter2.mp4 and repeat]
  G --> H[Starting another audio pauses the previous audio and video]
  G --> I[Crop upper half by default]
  I --> J[Backend confirms manage-users role]
  J --> K[Show the complete presenter frame]
  E[Home selected] --> F[Course catalog]
```

## 開發方法

每筆 Maya 音訊的獨立影片依序播放 `reporter.mp4` 與 `reporter2.mp4`，第二段播完再回到第一段；音訊等待、暫停或結束時不啟動下一段。先測兩段循環與暫停狀態，再修改播放事件；沿用既有公開媒體及角色檢查，不新增憑證。測試命令為 `node_modules/vitest/vitest.mjs run tests/learn`；部署後確認兩段影片都存在、可播放，以及切換音訊時各自暫停。

主播影片先以原始影片尺寸的上半部顯示；持有 token 的使用者經 Gateway 的 `/auth/admin` 成功驗證 `manage-users` 後顯示完整畫面。登出、跨分頁 token 變化、請求失敗均回到裁切狀態，並防止舊請求覆蓋新登入狀態。先測未登入、授權成功、403 與網路錯誤，再實作並執行 `node_modules/vitest/vitest.mjs run tests/learn`。此為前端呈現限制，影片來源是公開網址，不能防止直接取得完整影片；需要真正存取控管時必須改用後端授權的媒體來源。部署後須用實際管理員與一般使用者及不同尺寸影片驗證，現有影片網址先前回傳 404。

Maya 音訊卡片右側放置主播影片，各卡片建立獨立影片並由音訊 playing、waiting、pause 與 ended 事件控制；開始另一筆音訊時暫停其他音訊。先以 `tests/learn/marketAudioPlayback.test.ts` 重現多播放器需求，再抽出事件控制並測試；媒體資源使用公開 URL，不需新增憑證。執行 `node_modules/vitest/vitest.mjs run tests/learn`。2026-11-04 檢查指定的 `https://tymultiverse.cc/images/people/reporter.mp4` 回傳 404，影片檔案需上傳後才能驗證實際播放；部署後還須以瀏覽器測試音訊切換與窄螢幕版面。

1. Reproduced the mixed view: the course catalog and Maya audio list were both rendered inside the initial overview. Added a regression test requiring a separate audio view and sidebar control.
2. Moved the existing audio list intact into its own phase and added the Maya sidebar action. Existing quiz topic buttons continue to open their matching quiz workflow; the home control returns to the catalog.
3. No credentials or external services are involved. Audio fetching remains read-only and uses the existing public API.
4. Verified with `node_modules/vitest/vitest.mjs run tests/learn tests/portfolio/aboutLayout.test.ts` (13 passed). No deployment run in this change; deploy through the existing Jenkins frontend pipeline and confirm selecting Maya hides the course overview, while selecting a TOEIC topic opens only that quiz.

## 主播影片銜接與開發方法

```mermaid
flowchart LR
  A[音訊播放] --> B[播放目前影片]
  B --> C[預載下一段影片]
  B -->|結束| D[啟動下一段]
  D -->|playing| E[顯示新畫面並重置前一段]
  E --> B
```

## 開發方法

先以測試重現切換來源造成的空畫面，再以兩個靜音影片元素預載並等待下一段播放後交接；音訊暫停或緩衝時兩者一起暫停。此流程不使用憑證；以既有影片來源先驗證，再隨前端正常部署。未來更換片段應確認畫面內容本身的首尾連續性，並在行動瀏覽器檢查實際解碼與播放。測試：`vitest run tests/learn/marketAudioPlayback.test.ts`；自動測試不涵蓋真實影片解碼及行動瀏覽器畫面。
