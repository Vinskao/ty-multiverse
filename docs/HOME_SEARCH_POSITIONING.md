# 首頁搜尋與產品定位

## 定位

名稱：TY 市場研究室（英文 TY Market Lab，保留 TY Multiverse 作為既有品牌）。

核心主張：彙整市場資料與他人觀點，把自己的判斷記成資料，再用圖表做決策。

主要讀者是不熟悉程式開發、想開始量化研究的人，以及希望用圖像比較投資條件、又不想負擔高額固定訂閱的一般投資人。量化在此指資料化、可追蹤的研究流程；目前不宣稱提供策略回測、自動下單或獲利保證。

## 首頁搜尋入口

- Title：免寫程式的量化研究與投資決策圖表｜TY 市場研究室
- H1：免寫程式，建立自己的市場判斷
- 摘要：整合總經、台股籌碼、財報與研究觀點，將自己的判斷記成資料，用圖表比較市場訊號與決策條件。說明預計按使用量計費，服務以 email 洽詢。
- 搜尋意圖：不會寫程式如何做量化研究、投資決策視覺化、市場資料整合、台股籌碼與總經圖表、研究觀點整理。這些是定位假設，尚無搜尋量或排名資料。
- 首頁以繁體中文輸出可索引正文，首次瀏覽預設中文；保留使用者既有中英文偏好。
- 修正共用版型重複 title，拆開 description 與 Open Graph 摘要，增加分享標題與首頁 canonical。Canonical 固定公開首頁，不含登入參數。

## 內容與聯繫順序

1. 首屏：名稱、主張、適用對象、email 洽詢與圖表入口。
2. 流程：彙總資料與觀點 → 加入自己的判斷 → 圖像比較與決策。
3. 說明：不會寫程式也能從資料、判斷條件與圖表開始。
4. 計費：僅說明預計按使用量計費，價格與開放方式尚未公布。不新增付款、方案、額度或計費機制。
5. 實際工具：保留總經、研究、籌碼與財務圖表，讓訪客直接看到內容。技術履歷相關內容作為背景資訊。

試用、整合與服務需求皆以 tianyikao@gmail.com 聯繫，不建立購買或預約流程。

## Email 聯繫（2026-10-26 整理）

原本首頁有四個寫死的 `mailto:`，樣式各不相同：首屏外框按鈕、計費區和頁尾的裸地址、維護者區的小連結。頁尾那段只有一行字加地址，緊貼 footer，沒有收尾的力道。另外，沒有設定預設郵件程式的電腦按 `mailto:` 不會有任何反應，看起來就像壞掉。

現在的做法：

- **單一來源：** 地址、洽詢主題、信件主旨與範本都在 `src/scripts/contact.ts`，由 `mailtoHref(topic, lang)` 產生連結。頁面和元件不再寫 `mailto:`，`tests/seo/homeSeo.test.ts` 會檢查這一點。
- **三個主題：** 申請試用、資料整合、功能需求。點下去的信件會帶好主旨（例如 `[TY 市場研究室] 申請試用`）和要回答的問題，回信時就知道對方的研究方式、資料來源或問題。
- **編碼：** 用 `encodeURIComponent`，空白是 `%20`、換行是 `%0A`。`URLSearchParams` 會把空白編成 `+`，Outlook 和 Apple Mail 會原樣顯示加號（RFC 6068）。
- **語言：** 所有帶 `data-contact-topic` 的連結（首屏、維護者區、收尾區）在切換中英文時改用對應語言的主旨與範本。
- **沒有郵件程式也能聯繫（2026-10-26 再修）：** 第一版上線後回報「這些都不能點」。按鈕其實點得到（沒有東西擋住），但沒設定郵件程式的電腦按 `mailto:` 什麼都不會發生。現在點任何聯繫連結都會開一個選擇視窗：預覽收件人、主旨與範本，並提供「用 Gmail 寫信」「用 Outlook 寫信」（網頁版撰寫頁，`composeLinks`）、「用電腦的郵件程式」（`mailto:`）和「複製信件內容」（`mailText`）。沒有 JavaScript 時連結仍是 `mailto:`。收尾區另有「複製地址」按鈕；`navigator.clipboard` 不能用時改用選取複製，並以 `role="status"` 告知結果。
- **版面：** 首屏主按鈕改成實心金色「寄信申請試用」；計費區改連到 `#contact`；頁尾換成 `HomeContact.astro` 的收尾區（大標、三張主題卡、直接寫信與複製）。金色用 `--cta-gold`，淺色主題換成較深的金色以維持對比。

測試：`tests/contact/contact.test.ts`（主旨、範本、編碼、英文版、未知主題的預設）、`tests/seo/homeSeo.test.ts`。

## 後續搜尋成效工作

部署後透過 Search Console 檢查首頁索引與 Google 選定的 canonical，再觀察實際查詢詞、曝光與點擊，調整文案。尚未操作 Search Console 或提交索引。

有足夠實際內容後，再增加獨立的「免寫程式量化研究入門」、「把市場觀點變成可驗證條件」與「總經和籌碼圖表怎麼一起看」指南，避免建立只有關鍵字的空頁。現有 sitemap 與 SSR 頁面涵蓋率需另行核對，不把增加 metadata 視為索引完成。

參考 Google Search Central：[標題連結](https://developers.google.com/search/docs/appearance/title-link)、[搜尋摘要](https://developers.google.com/search/docs/appearance/snippet)。搜尋引擎可能依查詢重寫標題與摘要，這次變更不代表排名保證。

## 首頁其他調整（2026-10-26）

- **帳戶區塊登入後才顯示：** Account Portfolio、配置甜甜圈、每日資產走勢都標 `data-account-only`，伺服器輸出時就是 `hidden`，`fetchPortfolio` 依 `hasMarketAuth()` 開關（`src/scripts/market/accountSections.ts`）。未登入的訪客不再看到一整塊「--」。
- **市場總覽靠左：** 市場總覽放在 `.hero` 裡，繼承了 `text-align:center`，所以「多國重要總體經濟資料」等標題在靠左的框裡置中。現在 `.home-page .market-overview` 靠左；圖表標題、資料期間、讀數與圖例原本也靠同一個繼承置中，另外明確保留置中，圖表外觀不變。
- **給 AI 讀的文字收起來：** 持股籌碼摘要下方的逐檔文字訊號（例如「2330 台積電: 外資連續 12 日賣超…」）與附註放進 `<details class="market-brief-ai">`。內容仍在伺服器 HTML 中，不執行 JavaScript 的 AI 一樣讀得到。
- **技能泡泡圖回來：** f254ee1 把 D3 泡泡圖從首頁拿掉。現在放在「查看完整技術能力與工具」裡、分類清單上方，`client:visible` 在展開時才載入。分數算法抽到 `src/scripts/skillBubbles.ts`（shade1=5 … shade5=1，依類別加總）。

測試：`tests/home/accountSections.test.ts`、`tests/home/skillBubbles.test.ts`、`tests/seo/homeLayout.test.ts`、`tests/contact/contact.test.ts`。
