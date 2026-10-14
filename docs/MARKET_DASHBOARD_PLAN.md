# 首頁市場儀表板與 About 語系修正計畫

規格日期：2026-10-14。以下納入最新使用者指示，優先於本文件先前紀錄及 `PLAN_TO_PRODUCTION_WORKFLOW.md` 的歷史紀錄。

## 執行授權與完成標準（最新決議）

- 使用者已授權從來源查證、定案、開發、migration、建置一路做到正式部署與 UI 驗證，不需再次等待「開始開發」指示，也不能在畫面骨架或 build 後結束任務。
- 前置來源、費用、權限與可行性查證均屬 plan 階段。先盡合理查證責任；確認在現有免費來源／既有帳號權限內無法取得的指標，記錄證據與原因後排除本次範圍，繼續其餘工作。不得把「尚未查證」當成「確認缺少」，也不得把未實作的 API 當成外部阻礙。
- 不另購資料或引入新付費／授權依賴。必要新帳號、付費或未取得供應商授權的資料，列入排除清單；除非使用者另行明確同意。
- 完成必須同時滿足：新不可變 image 已上線、rollout 成功、正式站 UI 驗證完成、登入使用者帳號後確實看到自動五大部位，並與有效持倉快照核對排序及去重。API 200、build 通過、觸發 Jenkins 或停用分頁均不足以宣告完成。
- 訪客須看見與登入者相同的公開市場標的與行情；原 Portfolio 與管理員操作維持既有授權，公開回應不得包含持倉數量、金額、方向或帳戶識別。
- 本輪已依使用者授權接續實作及準備部署；不得將先前「只更新 plan」的歷史狀態視為目前限制。

## 畫面與互動

首頁市場區使用全寬，依序顯示固定台指期近月、自動五大持倉與管理員自訂五格，共最多 11 檔。每檔摘要顯示代碼、名稱、現貨／期貨、價格、漲跌、成交量、資料時間；點選任一檔，在摘要下方展開該檔完整儀表板。避免同時渲染 11 組大型圖表。手機摘要換行，明細分頁可切換。

明細分頁：

| 分頁 | 呈現 |
| --- | --- |
| 行情 | 三個月價格與成交量，日 K 為預設；報價與盤後資料各自標時間 |
| 法人 | 外資／投信／自營商買賣超柱圖＋收盤價，5／10／20 日累計與逐日表；持股存量另列，不由買賣超冒充 |
| 資券與借券 | 融資、融券每日增減柱圖＋收盤價；餘額線圖；借券與借券賣出分開 |
| 分點與主力 | 買超／賣超 TOP15 橫條與分點表，買賣張數、淨額、可驗證的均價；主力淨額及 10 日累計走勢 |
| 持股結構 | 各類持股張數／比例的橫向比例條與表格；集保級距分布與每週變化；董監持股、質押、轉讓列表 |
| 期貨籌碼 | 法人多空交易與未平倉、淨額歷史；大額交易人資料另列。商品彙總與特定到期契約明確區別 |

股票沒有期貨未平倉、期貨沒有股票發行股數等，依商品類型顯示適用分頁。個股期貨可另顯示其標的股票籌碼，必須標示為「標的現貨」，不可當成該期貨資料。董監與外資等分類可能重疊，故不做總和必須等於 100% 的持股圓餅圖；集保級距依原始定義呈現。

上述為原始需求全集；交付以來源定案後的納入／排除清單為準。排除項目不要以停用按鈕、空圖或假資料冒充交付。若採本站計算的主力指標，必須明示公式與涵蓋的分點數，且與來源原指標分開；未核對原定義前，不聲稱與券商 App「主力成交力」相同。

市場區下方放全寬 AI Token Usage。Portfolio 維持既有保護。About 依 URL lang 決定初始語系，修正硬編碼、localStorage 衝突與頁面切換不同步。

## 選股與權限

固定台指期近月不可編輯。自動五大持倉依每個新有效持倉快照重算，股票按市值、期貨按絕對名目曝險，統一幣別；固定指數與自動清單去重。自訂上限預設五格，設定、順序與選擇存 PostgreSQL，由管理員操作，其他人唯讀。搜尋股票／期貨代號、公司／商品名稱，顯示到期月份並由後端驗證；排除已有標的。Mini TSMC Futures 不預填。若自訂標的後來進入自動清單，只呈現一次並保留原自訂偏好。

訪客與登入者看到同一組標的與市場資料。公開 API 不含持倉數量、金額、方向及帳戶識別。

## 來源優先與免登入／費用查證

以下「免登入」指實際讀取範例時沒有提交帳密；不等於已驗證所有日期、所有股票或公開轉載權。

| 優先 | 來源與範圍 | 帳號／費用 | 查證結果 |
| --- | --- | --- | --- |
| 1 | TWSE T86、MI_QFIIS、MI_MARGN | 範例請求免登入、無付款步驟 | 已取得三個月前法人買賣超、外資持股、融資融券 JSON |
| 2 | TPEX dailyTrade | 範例請求免登入、無付款步驟 | 已取得 2026/07/13 上櫃法人明細；外資持股與資券其他介面仍待逐項驗證 |
| 3 | TAIFEX 公開法人及未平倉 | 公開頁免登入、無付款步驟 | 已取得 2026/07/13 TXF；公開下載有近三年範圍，不能與付費申購混淆；個股期貨範圍待驗證 |
| 4 | Shioaji 報價／歷史／合約／私有持倉 | 使用既有券商 API key 與帳戶，非匿名 API | 已有專案整合；部署前確認既有權限與額度，不要求另辦新帳號 |
| 5 | TDCC、MOPS | 有公開查詢入口；不可先保證所有介面免登入且自動化可用 | TDCC 最新週 OpenAPI 可免登入讀取；官方歷史查詢表單 GET 公布日期選項與同步 token、一般 POST 可查指定股票／日期，已實測最新及三個月前資料。MOPS 董監相關端點仍待核實 |
| 6 | 富邦公開籌碼頁 | 已讀頁面免登入、無付款步驟 | 分點最新與 2026/07/01 皆在瀏覽器取得；後端直接 HTTP 回 403。需驗證正常瀏覽器收集工作在 OKE 可用；不能說已完成 API 化 |
| 排除 | 三竹 SDK | 有免費部分試用，但完整額度不明且未取得資料 URL | 依使用者決定排除 |
| 備援線索 | SITCA、FinMind、TEJ | SITCA 有公開週期報表；FinMind／TEJ 特定資料可能需帳號或付費 | 不偷偷引入帳號或付費依賴。SITCA 月前十大不能取代每日全部投信持股 |

### 2026-10-13 接續查證與本輪範圍決定

| 指標／商品範圍 | 本輪決定 | 端點與樣本 | 欄位、單位及頻率 | 費用／理由 |
| --- | --- | --- | --- | --- |
| 自動持倉選股及公開行情（台股／期貨） | 納入 | 既有 Shioaji portfolio 快照；新增 `/market/dashboard`、合約搜尋 | 完整快照才更新；公開只存代號、名稱、類型；行情快取 5 分鐘 | 沿用既有券商憑證與帳戶 |
| TWSE 三大法人每日買賣超 | 資料源納入後續收集；本輪尚未實作歷史圖表 | T86，`date=20261012`，stat=OK | 證券代號及法人買賣股數，單位「股」；日報 | 官方免登入 JSON；尚需欄位映射及三月回補測試 |
| TWSE 外資持股每日資料 | 資料源納入後續收集；本輪尚未實作歷史圖表 | MI_QFIIS，`date=20261012`，stat=OK | 持有股數、持股比例、法定上限；日報 | 官方免登入 JSON；尚未完成歷史 upsert |
| TWSE 融資融券每日資料 | 資料源納入後續收集；本輪尚未實作歷史圖表 | MI_MARGN，`date=20261012`，stat=OK | 信用交易欄位；來源單位／索引仍須按官方欄名映射 | 官方免登入 JSON；未完成明確 mapping 前不展示 |
| TPEx 三大法人每日買賣超 | 資料源納入後續收集；本輪尚未實作歷史圖表 | `dailyTrade?date=2026%2F10%2F12&type=Daily&sect=EW&response=json`，回應日期 115/10/12 | 25 欄含法人買進、賣出、淨額；重複名稱依欄群標頭解讀 | 官方免登入 JSON；上市櫃欄位結構不可共用索引 |
| TAIFEX 法人與大額交易人 | 法人日期資料源納入後續；大額交易人延後 | Official OpenAPI `MarketDataOfMajorInstitutionalTradersDetailsOfFuturesContractsBytheDate` 現行樣本日期 2026-10-13；官方日期查詢頁可指定 `2026/10/12` | 每日按指數類／股票期貨「商品種類」×法人，含交易及未平倉口數／契約金額；「股票期貨」不是個別 2330/QFF 契約 | 公開免登入；日期查詢範圍官方頁稱近三年。API 無日期參數，需以歷史網頁端點實測後才納入三月 collector；不可宣稱個股期貨法人資料 |
| TDCC 集保級距 | 納入選定股票逐週回補及增量 | `/v1/opendata/1-5` 最新全市場樣本 2026-10-08；官方表單 `https://www.tdcc.com.tw/portal/zh/smWeb/qryStock` POST 可查 2330、2026-07-09 | 15 級距，人數／股數／比例；按來源日期保存週報 | 匿名官方頁面，無登入／付款；歷史保存一年。已確認表單 token/date/POST，可接入選定標的回補 |
| MOPS 董監持股／質押／轉讓 | 延後，不展示 | 官方 MOPS 有相關分類；本輪未驗證可重現端點及日期 | 欄位、頻率及歷史範圍未核實 | 未查證不等同缺資料；完成端點驗證後再納入 |
| 分點、主力與逐分點均價 | 逐分點原始資料有 TWSE、TPEx 官方付費商品；均未購買／整合 | TWSE 不含權證日報，2012-10-25 起、外部 NT$80,000/月；TPEx 不含權證日報，2014-12-01 起、外部 NT$50,000/月。TPEx S32 格式列證券代號、券商代號／名稱、成交價格、買進股數、賣出股數 | 日報欄位可支援分點買賣排行與各方向成交加權均價；仍須確認 TPEx 檔案交付與外部傳輸條款。券商自營併總公司 | 本計畫未授權新增付費資料，故未購買／未整合；富邦免費 TOP15 網頁不是本系統資料 API，且後端請求 403 |
| Shioaji 三個月 K 線歷史 | 延後，本輪不回補 | [官方歷史行情文件](https://sinotrade.github.io/zh/tutor/market_data/historical/) | 文件描述單次區間上限與 API 頻寬使用 | 尚未實作分段回補及額度監控，不能用即時 snapshots 冒充歷史行情 |
| 固定 TXF、自訂五格 | 納入本輪應用功能 | Shioaji 合約目錄及 Redis 行情 | 開高低、成交量、時間與漲跌 | 沿用既有 Shioaji session |

本輪程式已落地公開安全的自動五大標籤快照、管理員自訂設定 PostgreSQL 表、合約搜尋與即時行情 proxy。TWSE／TPEx JSON 僅驗證端點樣本，尚無籌碼歷史 collector、三月回補、來源日報資料表或歷史 UI。上表標註後續／延後者不算本輪交付。

### 正式站檢討：目前看不到原始籌碼頁面的原因

使用者回看正式站時確認只有市場摘要和即時行情，沒有原先要求的歷史籌碼頁。這是當時的驗收落差：來源研究及畫面規格已有紀錄，但籌碼歷史資料模型、排程、API 和圖表尚未交付。以下記錄那次檢討時的缺口；後續狀態以 2026-10-14 本文件末尾更新及部署證據為準。

「分點」功能仍未完成。TWSE Data E-Shop 有逐分點日報，2012-10-25 起，外部使用 NT$80,000/月；TPEx Data E-Shop 也有「買賣日報表-全部(不含權證)」，2014-12-01 起、每日 EXE/CSV、外部使用 NT$50,000/月。TPEx 官方 S32 格式 PDF 已確認欄位為證券代號、券商代號／名稱、成交價格、買進股數、賣出股數，單位元／股，因此也能按買進／賣出分別計算股數加權均價。兩邊都有排除權證的付費商品，符合使用者不看權證的偏好；但尚未購買或接入，本站目前仍無逐分點資料。仍需確認訂購、對外傳輸授權與日檔取得／解壓流程。富邦 TOP15 網頁僅為頁面來源，後端 HTTP 403，不能當成本系統的合規 API。未授權前不要抓富邦網站或冒稱已交付。

下一輪先完成來源關卡，不可再由摘要功能直接跳到部署驗收：

| 缺少資料／功能 | 目前狀態 | 下一步需要取得的證據或實作 |
| --- | --- | --- |
| 上市個股法人買賣超歷史 | TWSE T86 collector、coverage、API 與圖表已部署；選中上市股票有 63 個交易日，圖表 hover 顯示外資／投信淨股數，沒有資料表 | 例行日增量持續監控；依使用者要求維持 hover 呈現 |
| 上櫃個股法人買賣超歷史 | TPEx dailyTrade collector、coverage、API 與圖表已部署；選中上櫃股票有 63 個交易日，日期及單位由 API/圖表顯示 | 例行日增量持續監控；法人累計週期沒有另行實作或宣稱 |
| 外資持股（上市／上櫃） | TWSE 與 TPEx 外資持股來源已映射、收集並接入 Ownership 圖；外資持股比例、股數、法定上限 hover 顯示，無資料表 | 正式 API/API coverage 例行監控；TDCC 為獨立週持股級距，不與外資持股混用 |
| 融資融券（上市／上櫃） | TWSE MI_MARGN 與 TPEx margin/balance 已收集及部署；每日餘額、增減圖已顯示在圖表 hover，無資料表 | 正式 API/API coverage 例行監控 |
| 借券、借券賣出 | TWSE TWT93U 與 TPEx margin/sbl 已映射、收集及部署；每日餘額／流量圖 hover 顯示，無資料表 | 正式 API/API coverage 例行監控；與融券餘額分開 |
| 分點買進／賣出及排行（使用者特別關注） | TWSE 官方商品「買賣日報表(全部不含權證)」每日、2012-10-25 起，外部 NT$80,000/月；TPEx 官方「買賣日報表-全部(不含權證)」每日 EXE/CSV、2014-12-01 起，外部 NT$50,000/月。TPEx S32 格式 PDF 確認代號、券商代號／名稱、成交價、買進股數、賣出股數 | 兩市場皆有官方排除權證付費來源，欄位足以計算分點買賣量與買賣加權均價；均未購買／接入，本站仍無資料。仍需確認日檔交付、EXE 解壓與對外傳輸授權 |
| 分點均價與券商「主力」 | 逐分點均價及主力定義未核實、未實作 | 必須得到買進與賣出逐分點成交金額/張數才能計算均價；主力公式需先定義，並標示涵蓋家數，不能冒稱券商相同指標 |
| TDCC 集保級距歷史 | 官方逐檔歷史 GET token/date 解析、POST parser、週回補、ownership API/UI 已部署；選中股票有 13 週，TDCC 級距可選，週圖 hover 顯示股數／人數／比例，無資料表 | 例行週增量監控；各檔歷史週數依已入庫資料顯示 |
| 董監持股、質押、轉讓 | 只找到 MOPS 分類入口；端點、歷史、欄位未查證且未實作 | 找可重複查詢的正式端點/檔案，確認公告日、持股、質押與轉讓數量和修正公告規則 |
| 台指期法人及大額交易人 | TAIFEX 類別法人交易／未平倉來源已接入；目前 TXF 只有 17/66 個工作日 coverage 成功，餘 49 日 HTTP 429。此資料為商品類別彙總，不是個別合約部位；大額交易人未實作 | 驗證 #91 的 5 分鐘錯誤重試及回補到完整有效交易日；大額交易人來源另查證 |
| 個股期貨法人籌碼 | TAIFEX `STF` 類別法人彙總已接入並映射到股票期貨商品；QFFJ6 對應仍為股票期貨類別彙總，非 QFFJ6 個別合約部位，現有 coverage 僅 17/66 成功、49 日 429 | #91 後續回補驗證；個別合約部位若官方不提供，維持明確標示類別彙總 |
| 三個月 K 線與成交量 | 股票日 OHLCV 有 63 個交易日；期貨價量日資料已收集。依使用者要求 QFFJ6 圖表以現貨 2330 ticker 顯示 63 個現貨交易日；OHLCV hover、點日固定、拖曳區間顯示報酬，沒有常駐表格 | 持續監控來源日期及缺口；正式站及本機頁已驗證圖表資料 |
| 統一 DB／排程／覆蓋狀態 | Market daily history 與 source/code/date coverage、migration、92 日回補、每日排程與跨 pod advisory lock 已部署；股票 sources 有約 63 交易日，TAIFEX 仍在回補。錯誤重試修正 `798a906` 已推送，Jenkins #91 待上線 | 驗 #91 建置與 rollout，確認 coverage 會重試錯誤日並往後推進 |
| 籌碼圖表及 hover | 行情、法人、融資融券、借券、外資持股、TDCC ownership 圖均已上線；指標值在 hover/readout，不用 OHLC／法人／資券／借券／持股表，也移除重複大型即時報價卡 | 正式頁已驗證價格圖與持股類圖；法人 hover 需在本輪完成正式頁再驗 |
| 手機及互動驗收 | 390px 正式頁 document scroll width = viewport；圖表使用窄側留白；桌面及手機無水平溢位。單日定位與拖曳區間 handler 及 range 百分比在正式頁驗證過 | 仍需在已部署最新 UI 的正式頁補做完整 view 重驗；權限保護的 custom 管理編輯因沒有有效 token 未驗 |

下一階段收尾標準為：#91 部署後持續確認 TAIFEX 無錯誤的回補覆蓋，正式站複核法人 hover 與來源日期、行動版及現有圖表；付費分點資料、MOPS 董監歷史與個別股票期貨法人部位若沒有合法可用來源則維持未完成，不能以市場摘要或類別彙總冒稱完成。圖表資料依使用者要求只在 hover/readout 顯示，不新增重複表格。管理員 custom 編輯需有效權限才能驗，未使用假 token。

### Telegram bot 查證狀態（2026-10-13）

使用者指定在 Telegram bot 頻道 `https://web.telegram.org/a/#-1001432508962` 問三項問題，並曾提醒該頁面可能被瀏覽器安全政策拒絕且不可繞過。後續使用者明確要求可用方式與 Telegram、Discord 互動；沿用已登入 Chrome 中正常可見的 Telegram/Discord UI 操作，未使用私有 API 或繞過安全控制。

| 問題 | 本機 repo 已確認 | 尚不能確認／後續需問 bot |
| --- | --- | --- |
| 搜尋台積電為何沒出現小型台積電期貨 | repo 原搜尋是部分比對 code/name；混合搜尋的股票權證曾可能佔滿 20 筆。測試 QFFR1 不是正式目錄證據。 | Bot 以 Shioaji 1.7.8 模擬目錄查到 QFF：`api.contracts.futures("QFF")` 可取月份合約，例如 `code=QFFJ6`、`name="小型台積電期貨 202610"`、`delivery_month="202610"`；近月別名 QFFR1 的 `target_code=QFFJ6`、名稱為「小型台積電期貨 近月」，並有 `underlying_code="2330"`。名稱部分比對「台積電」應命中；搜尋、filter 與 20 筆上限是應用端邏輯，Shioaji 沒有搜尋 API。仍沒有正式站當時目錄快照，不能回溯證明當時具體漏掉原因。 |
| 排除權證但讓期貨出現 | 原實作曾錯用 category/name 推測權證。 | Bot 確認合約欄位 `security_type`：股票／ETF=`STK`、權證=`WRT`、期貨=`FUT`；排除 `WRT`。股票和期貨分開查、分開排序即可避免互相擠掉。 |
| 十個清單候選商品保留在 table | repo 已有候選 table 雛形，但只記錄搜尋結果，來源是 `shioaji-search`，未接十個清單 batch ingestion。 | Bot 指出「十個清單」由產品方自行定義，並稱六種 scanner 僅當下排行、無歷史成員；但[Shioaji 官方 scanner 文件](https://sinotrade.github.io/tutor/market_data/scanners/)的 `api.scanners` 有 `date` 交易日期參數，預設今日。是否可穩定查回過去日期、最長回溯深度與資料是否完整，文件尚未說清，需實測，暫不採 bot 的「無歷史」作最終定論。六種 scanner 為成交量、成交值、漲跌幅、漲跌價、振幅、成交筆數。候選身份以合約 `code` 為準，期貨月份已在 code；R1/R2 是會換月的別名，不適合作為歷史 key，應解析 `target_code` 後記錄實際月份合約。每次來源觀測另存 source membership / first_seen / last_seen；bot 未指定過期政策。產品方仍須明確列出十份清單，並決定是否以六種 scanner 加四個自有清單構成。 |

#### 實際詢問結果（2026-10-13 23:38 Asia/Taipei）

- Telegram 已向 `@ShioajiSupportBot` 發送以上三題。Bot 原文回覆：「💤 Bot 休息中（值班時段 07:00-21:00），緊急或錯誤訊息我會處理；一般問題明天早上回覆，或到 Discord #python / #技術問答 發問（那邊 24 小時可討論）。」因此 Telegram 尚未提供三項技術答案；等待值班時段後續回覆。
- Discord 已在既有 `#python` 討論串「台股與期貨完整籌碼資料來源確認」補問相同三個技術主題，避免另開重複 thread。送出後即時檢查尚無 bot/社群答覆，故目錄內容、權證分類欄位及十個清單資料可得性仍待確認。
- 本機 repo 可確認：`_search_contracts` 遞迴搜尋當前 `api.Contracts.Futures` 目錄內 code/name，按代碼排序後最多回 20 筆；測試中的 QFFR1 假合約不能證明正式當下目錄狀態。Shioaji 搜尋結果目前無權證專門排除邏輯；十來源候選歷史資料表目前不存在。
- 候選 table 的 `productType + code + deliveryMonth` 身份鍵、來源 membership 分開保存、跨清單去重及 last-seen 過期策略，目前只是本文件提出的設計建議，尚未經 Shioaji/Discord 確認。

本輪只做查證、對外提問與文件紀錄，沒有修改搜尋程式、資料表或部署，也未提交。等待 Telegram 值班回覆及 Discord thread 回覆後，再補錄 bot/社群原文重點、結論與仍未確認項目；不要把 repo 推論當成對方確認。

#### 2026-10-13 晚間先行實作（10/14 客服答覆前的暫定版本）

依使用者指示，先完成不依賴 bot 技術答案的搜尋改善與候選表雛形，整體籌碼歷史 collector／圖表及部署等工作留待明日再決定。

- **上面兩項為當時假設，已由 2026-10-14 客服答覆修正**：權證改看 `security_type == "WRT"`；期貨 alias 改解析 `target_code`；唯一鍵改以商品類別＋合約 code；候選永久保留，不採 90 天 expiry。更新內容見下方「2026-10-14 客服答覆與結論」。
- **範圍限制：**「十個清單」仍未列出實際十來源，故候選 table 目前只累積 Shioaji 搜尋實際回傳的商品，並非完整抓取十張清單；尚無來源清單 batch ingestion，也沒有把未曾搜尋到的完整合約目錄自動加進 table。客服答覆已確認 Shioaji scanner 不提供歷史成員。
- 驗證：前端使用 workspace Node v24.19.0 執行 `npm run build` 通過；後端 Python `compileall` 及兩 repo `git diff --check` 通過。後端 pytest 未能執行，因系統 Python 沒有 pytest。未部署、未提交。既有未提交的本文件與 `docs/PLAN_TO_PRODUCTION_WORKFLOW.md` 均保留。

#### 2026-10-14 客服答覆與結論

- 使用者開啟已登入的 Telegram 與 Discord 頁面後，透過正常 UI 檢查並在 Telegram 跟進原提問；10/14 10:39 `@ShioajiSupportBot` 回覆下列技術內容。Discord 指定 thread「台股與期貨完整籌碼資料來源確認」仍未見後續訊息。
- Bot 原文重點：`api.contracts.futures("QFF")` 可列出 QFF 月份合約；模擬目錄範例為 `QFFJ6` /「小型台積電期貨 202610」/ `delivery_month="202610"`。近月 alias `QFFR1` 的 `target_code="QFFJ6"`、`underlying_code="2330"`。搜尋是應用邏輯；API 沒有搜尋端點。
- Bot 原文重點：依合約 `security_type` 辨別 `STK`、`WRT`、`FUT`，排除權證應用 `WRT`；股票和期貨各自搜尋、排序。
- Bot 原文重點：Shioaji scanner 有六種排行（成交量、成交值、漲跌幅、漲跌價、振幅、成交筆數），bot 稱只有當下排行、沒有歷史成員；「十個清單」需由產品方自行定義。唯一身份用合約 code；月份已含在期貨 code，R1/R2 會換月，應解析到 `target_code`，不能以 alias 作歷史 key。
- 官方文件交叉核對：`api.scanners(scanner_type, date=None, ...)` 和 HTTP scanner endpoint 都有交易日期參數，日期預設今日，並列明六種 scanner 類型。這代表可以指定日期查詢的介面存在，但文件沒有給回溯期限，也未保證舊日期一定可查；與 bot 的歷史可得性說法有落差。實際查詢過去交易日、休市日和較早日期並記錄回傳日期/空結果前，資料可得性維持「待實測」。
- 官方合約文件也說明 1.7.0 仍相容舊式 `api.Contracts` 存取；回傳物件改為包含 `security_type` 的 `StockInfo`／`FuturesInfo` 等。因此現行舊式目錄遍歷不應單因 1.7 升版就失效；仍須以正式執行環境目錄實測確認。
- 結論及未確認：目前未取得原搜尋當下的正式站合約目錄，故不能判定 10/13 正式站實際漏列根因。十個來源的確切名稱仍要由產品方定義；若採六種 scanner，還要指定另外四個清單及每份清單的公開/授權來源。Bot 未提供股票代碼變更、下市後保留期限的規則；本計畫決定曾觀察到的候選永久保留、下市狀態另作後續 metadata，不因當日排行缺席刪除，讓「曾出現即可隨時加入」成立。過去 scanner 成員能否由 Shioaji 日期查詢回補，待官方端點實測後決定。
- **使用者 2026-10-14 最新決議：**使用者表示「不管十個清單了，繼續開發完成」。因此不做 Shioaji 六種 scanner 加四個來源的十清單匯集，也不再要求使用者定義來源。已經要求的歷史候選 table 仍保留，收錄本站實際搜尋或觀察到的商品，供管理員之後加入 custom；不把它描述成已涵蓋十個來源。
- 已依答覆修正實作：用 `security_type == "WRT"` 排除權證；R1/R2 alias 解析 `target_code`，候選唯一鍵為合約 `code`（月份已含在 code，`delivery_month` 僅供顯示）；移除 90 天候選期限，並新增 migration 合併同 code 重複列、調整唯一鍵和清除 expiry。已知歷史候選可在合約目錄缺席時仍加入 custom，但即時報價可能為空。
- 候選 ingestion 目前記錄實際搜尋回傳的合約；依使用者最新決議，不新增 scanner 或十來源批次匯集需求。
- 驗證：`poetry run pytest tests/test_shioaji_market.py tests/test_market_dashboard.py -q` 通過（27 passed）；後端 compileall、前後端 `git diff --check` 通過；workspace Node v24.19.0 下 Astro production build 完成。未執行 migration、未部署、未提交。Build 有既有背景圖片解析與 sitemap `site` 設定警告，build 本身成功。

#### 2026-10-14 持續開發：第一批股票歷史資料管線

使用者要求繼續完成計畫，並詢問是否已具備全部資料來源。答案是否；但已具備足夠證據先交付一批正式免費來源，其他來源同步查證，不因來源不齊停止已可完成部分。

- TWSE 樣本日 `2026-10-12`：`MI_INDEX` 個股日收盤行情、T86 法人、MI_QFIIS 外資持股、MI_MARGN 資券均返回 `stat=OK`。已用 2330 實際回應驗證代碼、行情、單位及欄位 mapping；T86／MI_QFIIS／MI_MARGN 都接受日期參數。
- TPEx 同日樣本：官方日期 API `afterTrading/dailyQuotes`、`insti/dailyTrade`、`margin/balance`、`margin/sbl` 均返回 `stat=ok` 及所請日期。已用 6488 真實回應核對行情、法人、資券欄位與借券賣出餘額。法人 JSON 重複通用欄名依官方開放資料欄位順序對應，淨買賣欄位確認為外資及陸資合計 index 10、投信 index 13、自營商 index 22、總計 index 23。
- 新增 `maya_sawa_market_daily_history` 與 `maya_sawa_market_history_coverage`：依 source/code/trading date 保存原始單位明確的 normalized JSON、來源 URL、抓取時間，以及 `ok`／`no_data`／`error` 覆蓋狀態。新增 SQL migration `maya-sawa/scripts/sql/20261014_market_history.sql`。
- 新增每日 collector：自動／custom 選股中的股票首次回補近 92 個曆日、之後每日更新；最近數日重新抓取以吸收來源修正；以 PostgreSQL advisory lock 避免多 pod 重複下載。選擇新的 custom 股票時排入背景回補。新增公開且只回傳公開交易資料的 `/market/dashboard/history/{code}`，Maya Sawa 關閉時取消排程。
- 前端新增行情、法人、資券與借券分頁、圖表和每日表格；借券股數與融資融券張數分開標示。歷史候選維持搜尋來源，不再追十清單批次匯集。
- 本輪驗證：真實 API 樣本八種 parser 全數命中目標商品；`poetry run pytest tests/test_market_history_collector.py tests/test_shioaji_market.py tests/test_market_dashboard.py -q` 通過（32 passed）；Astro build 以 Node 22.12.0 通過；前後端 `git diff --check` 通過。build 仍有既有背景圖解析與 sitemap `site` 設定警告。
- 尚未執行 production migration、尚未部署或正式站 UI 驗收。這批資料管線目前涵蓋股票價量、三大法人、TWSE 外資持股、兩市場資券及 TPEx 借券賣出餘額，不涵蓋 TWSE 逐檔借券餘額、分點逐券商交易、TDCC 歷史級距、MOPS 董監事件、TAIFEX 歷史籌碼、個股期貨歷史 K 線與上述各項 UI。這些仍是後續工作，來源不足的欄位須逐項查證並附證據。

#### 2026-10-14 持續開發：TWSE 借券及 TDCC 歷史來源

- TWSE `TWT93U` 公開日期端點 `https://www.twse.com.tw/rwd/zh/marginTrading/TWT93U?date=20261012&response=json` 實測返回 2026-10-12、`hints: 單位：股`、2330 列及融券與借券賣出分開欄位。官方商品商店另有 TWT93U 訂閱檔並標價月費；本站只使用免登入報表端點，不使用訂閱檔。已加 `twse:borrow-short` collector、parser 和借券圖表來源，增加 parser fixture。
- TDCC `/v1/opendata/1-5` 實際免登入返回 2026-10-08 的全市場每檔 15 級距資料；官方 `qryStock` 頁 GET 可取得 session cookie、同步 token、最新/歷史日期，下行一般 POST 帶代碼與日期可查單檔。已實測 2330 最新週 2026-10-08 與三個月前 2026-07-09，均回傳正確日期、15 級距及股數/人數/比例；parser 亦對 2026-07-09 真實 HTML 完整抽取 15 級。已接入逐週 collector、coverage、ownership view API 及持股結構表，按官方真實週日期保存，只有選定股票才查詢及入庫。官方頁說歷史保存一年。
- TAIFEX 官方 OpenAPI `DailyMarketReportFut` 及 `MarketDataOfMajorInstitutionalTradersDetailsOfFuturesContractsBytheDate` 可匿名讀當日全集；2026-10-13 樣本的法人資料依「臺股期貨／股票期貨」商品種類 × 自營商/投信/外資分組，沒有將個股期貨細分到 2330/QFF。官方網頁日期查詢可查 2026-10-12，且說明僅提供交易日前三年。故市場商品種類法人可做為單獨市場頁，個股期貨逐合約法人仍不納入；本輪尚未接 collector/API/UI。
- 首頁 ownership tab 的 TDCC 展示已按最新要求改為選級距週線圖，hover 顯示日期、人數、股數與比例，不顯示表格；目前 production 資料只有 2337、3081 各 13 週，2330 尚無資料，待修 collector 選取／回補並驗收。
- TAIFEX 當日 OpenAPI 樣本沒有 date 參數；官方日期查詢頁雖可查舊日，但個股商品粒度仍是類別彙總，不可當 QFF 等個別合約法人。TXF/個股期貨歷史價量與期貨籌碼 UI 仍未完成，未將即時 TXF quote 當日 K 線。
- 驗證：`poetry run pytest tests/test_market_history_collector.py tests/test_shioaji_market.py tests/test_market_dashboard.py -q` 36 passed；TDCC 公開表單真實 2026-07-09 樣本解析 15 級通過；後端 compileall 通過。Astro production build 通過（有既有背景圖解析及 sitemap `site` 設定警告）；兩 repo `git diff --check` 通過。production migration/deploy/UI 均未執行。

已驗證 URL：

- `https://www.twse.com.tw/rwd/zh/fund/T86?date=20260713&selectType=ALLBUT0999&response=json`
- `https://www.twse.com.tw/rwd/zh/fund/MI_QFIIS?date=20260713&selectType=ALLBUT0999&response=json`
- `https://www.twse.com.tw/rwd/zh/marginTrading/MI_MARGN?date=20260713&selectType=ALL&response=json`
- `https://www.tpex.org.tw/www/zh-tw/insti/dailyTrade?date=2026%2F07%2F13&type=Daily&sect=EW&response=json`
- `https://www.taifex.com.tw/cht/3/futContractsDate?queryType=1&goDay=&doQuery=1&dateaddcnt=&queryDate=2026%2F07%2F13&commodityId=TXF`
- 富邦最新分點：`https://fubon-ebrokerdj.fbs.com.tw/z/zc/zco/zco_2330.djhtm`
- 富邦歷史單日（由可見 UI 查詢得到）：`https://fubon-ebrokerdj.fbs.com.tw/z/zc/zco/zco.djhtm?a=2330&e=2026-7-1&f=2026-7-1`
- 富邦當前持股結構：`https://fubon-ebrokerdj.fbs.com.tw/z/zc/zcj/zcj_2330.djhtm`

## 還缺的查證如何處理

先做來源小型驗證，不先建完整畫面：上市與上櫃各一檔、台指期與個股期貨各一檔，分別測最近已公布日、三個月前日期、休市日。核對實際回傳日期及商品身份，禁止查不到指定日期時偷偷用最新值頂替。

必須在 plan 階段逐項定案（可用則納入；確認不可用則記錄後排除）的來源關卡：上櫃持股／資券、借券歷史、TDCC 歷史、MOPS 新入口及董監持股／質押／轉讓、富邦 OKE 收集可行性、逐分點均價、主力公式、投信／自營商存量方法與歷史、個股期貨法人資料範圍。已取得網頁不等於全部關卡已過。

若遇新帳號、付費或供應商授權需求，plan 階段列清供應商、缺少欄位、所需方案及可取得的價格／授權證據，依最新授權排除本次範圍，不需為此停下等待使用者。若免費源無法提供完整資料，明確列出不能取得的項目，不用缺值圖或推估假裝完成。

## 三個月回補與 DB

只有標的進入有效選定集合時啟動背景回補：往前三個曆月至最新已公布交易日；缺少十日累計前置資料時多抓必要交易日。日期報表同日共用一次下載，只保存選中標的資料。週／月資料保留原頻率，不製造每日點。

資料表至少包含設定與選定標的、收集任務／覆蓋範圍、日行情；法人、資券借券、分點、持股觀測與董監事件表依最終納入的來源建立。以來源＋標的＋日期＋分類建立唯一鍵，重跑 upsert，保留來源時間、抓取時間、單位與必要原始回應以供追溯。

新增時回補，既有標的補缺漏，移除後停止增量但保留歷史。每日收盤後按各資料公布時間更新；接受上一交易日。重試有退避與檢查點，休市、未公布與抓取失敗分開記錄。頁面讀 DB／Redis，不由每個訪客觸發爬蟲。

## 開發到部署與驗收

使用者已授權開始至部署完成；來源逐項納入／排除定案後直接進入開發。依序完成資料模型／migration、收集器及 API、介面、About i18n、相關測試與建置。驗收涵蓋三個月覆蓋、無重複／假日期、單位與淨額公式、權限、搜尋與五格上限、手機與桌面、直接中文網址及轉場。

優先使用 `ssh oke-node` 部署新不可變 image＋經驗證的 manifests／migration，確認 rollout、Pod image、資料筆數、公開／受保護端點與實際 UI。Jenkins 作備援。僅 apply 舊 image 不算新程式上線。若失敗自主修復／回滾，完成後回報正式站驗證證據。

### 本輪開發方法與正式站結果（2026-10-13）

1. 先讀本計畫、前後端及部署相關 `AGENTS.md`，查看兩個 repo 的 branch、status 和現有 diff；保留使用者原有修改與未追蹤文件。
2. 逐一查證候選來源的官方端點、實際回應、日期、欄位、單位、歷史深度及可部署存取方式。證據不完整者列入延後或排除表，不以「尚未查」當作來源不存在，也不把尚未實作寫成完成。
3. 先完成 API／儲存模型與可重跑 SQL migration，再做前端 UI 和 proxy；公開路由回傳 allowlist 投影，管理員路由沿用後端權限檢查。有效持倉才更新五大快照，錯誤或不完整資料不清除舊快照。
4. 執行相關後端測試與編譯、前端正式 build、diff whitespace 檢查；全專案檢查既有錯誤獨立記錄，不以警告掩蓋 build 結果。
5. commit/push 到既有分支，沿用 Jenkins 發佈流程建置不可變 tag；用 OKE rollout、Pod image/digest 與 migration/table 查詢核實服務端狀態。再從已登入正式站驗 UI、端點授權、畫面快照時間與資料庫快照。

本輪實際完成前後端變更、migration、測試和正式部署。後端測試 37 項通過；前端 build 通過。部署為前端 Jenkins #244 / `papakao/ty-multiverse-frontend:244`、Maya Jenkins #77 / `papakao/maya-sawa:77`，兩 deployment 均 READY 1/1；叢集記錄 image digest。Jenkins #77 顯示 Success；#244 console 證明以本輪 commit 建置並產生 :244 image，job 摘要狀態欄當時仍未更新。DB 已初始化，快照 2 rows、自訂設定 1 row。正式公開 API 回 200，匿名管理員自訂 API 回 401，公開 payload 僅包含市場固定／自動／自訂選擇欄位。登入正式站後，首頁五大自動部位與資料庫快照時間及商品一致；中、英文 About 直接網址均正確，SSO session 持續有效。未在文件或回報輸出帳戶金額。

尚未完成的原始範圍：三個月籌碼回補及其 collector／歷史圖表、未通過證據關卡的來源，以及正式站手機尺寸與每個互動狀態完整驗收；不得因市場摘要已上線而標記整份原始需求全部完成。正式首頁 footer 目前顯示 `revision unknown`，需另查 Jenkins runtime build arg 傳遞及修正後再驗證。


## 來源定案紀錄規則

接續執行者須在本文件維護決策表：`指標／商品範圍／納入或排除／端點與樣本日期／欄位及單位／歷史頻率／存取與費用／證據及理由`。所有待查證項目須收斂為納入或排除；暫時 HTTP 失敗不能直接證明資料不存在。核心選股、五大部位、管理員設定、PostgreSQL、既有行情與 About 不因其他籌碼源不足而整組排除。

## 正式站驗收清單

- [x] 每項本輪候選來源已明確納入／排除並附證據；尚待證項目仍標示待證或延後。
- [x] 固定近月台指期、自動五大及管理員自訂完成；每個新有效快照更新，失敗快照不清空舊有效選擇。
- [ ] 後端搜尋、商品身份／到期月份、重複檢查、五格上限、排序及 PostgreSQL 持久化完成；重啟後設定保留。
- [ ] 納入資料完成三個曆月回補、累計所需前置資料與每日增量；來源日期、單位、唯一鍵、任務狀態及 DB 筆數可核對。
- [x] 相關授權／資料完整性測試與 build 通過；另有全專案檢查既有 206 項錯誤記錄，未宣稱全部檢查通過。
- [x] 各變更服務以新不可變 image 部署，migration、rollout 及實際 Pod image/digest 已驗證；上一版 ReplicaSet 保留。
- [x] 正式站匿名可讀公開市場摘要；API 不含帳戶資訊；匿名管理員設定 API 回 401。
- [x] 真實瀏覽器登入後看到五大部位，並與服務端快照商品及時間核對；未輸出 token、帳密或持倉金額。
- [ ] 桌面／手機、摘要展開、適用分頁、搜尋新增移除、五格上限、重新整理、深淺主題及 View Transitions 通過。
- [x] About 直接中文／英文 URL 正式站驗證成功；儲存語系衝突及離開返回尚未逐項測。
- [x] AI Token Usage 緊接市場區下方且全寬；既有 Portfolio 經登入後保護有效。
- [ ] 回報正式站 URL、image/digest、資料覆蓋、登入後 UI 驗證證據及排除項目後才結束。

## VS Code 接續狀態（不代表功能完成）

### 給下一個 session 的接續摘要

使用者指出正式站沒有看到原始要求的籌碼及分點功能。先承認目前只交付市場摘要/選股，不要把前一輪的 source research 或部署當成籌碼功能完成。先讀本文件「正式站檢討」及上述來源表，從逐項來源查證和歷史資料管線開始，優先釐清分點資料是否有合法、可部署、逐分點的日期資料；再完成至少一組真實多日籌碼 DB/API/UI，部署後登入正式站逐頁驗收。所有尚未查證、無法取得和未實作項目分開列清。保留現有 diff 和 `docs/PLAN_TO_PRODUCTION_WORKFLOW.md`。

使用者準備以 `codex --sandbox workspace-write --ask-for-approval never` 開新 session；授權其依 repo 規則自主執行，不需再次詢問是否開始。下一個 session 可直接貼：

```text
接續執行 ty-multiverse-frontend/docs/MARKET_DASHBOARD_PLAN.md。先讀「正式站檢討：目前看不到原始籌碼頁面的原因」、「缺少資料／功能」清單及最新執行狀態，再依 Root AGENTS.md 只讀必要子專案 AGENTS。使用者已授權直接查證、開發、migration、測試、Jenkins 部署及正式站登入驗收，不要停在來源研究或摘要 UI，也不要再次詢問是否開始。優先查清合法可用的逐分點資料；沒有證據前不可說資料缺少，也不可把 TOP15 聚合當逐分點資料。把真正查不到的來源附端點/HTTP/文件證據排除；其他可用項目實作三個月資料管線、API 與實際籌碼 UI。部署後登入正式站確認真實籌碼圖表、表格、日期與單位，並更新 plan 的每項完成狀態。保留既有工作樹修改與未追蹤文件。
```

### 未提交程式與驗證狀態

本輪修改前端 About 語系、全寬市場清單、自動五大及管理員自訂 UI、公開與受保護 API proxy；後端新增自動五大標籤快照表、管理員自訂表、SQL migration、公開儀表板與合約搜尋 API。歷史籌碼 collector、三月回補、日行情資料庫與歷史圖表尚未實作，依來源表延後。

About 已改用完整 URL reload，缺省語系正規化為英文；正式站 zh/en 直接語系 URL 已驗證。後端相關測試 37 項通過，前端 build 通過。`astro check` 全專案先前曾列 206 項錯誤；正式站本輪部署、migration、API 權限、登入後五大部位及快照均已驗證。原始資料歷史範圍仍未完成。

全專案 `astro check` 曾回報 206 項錯誤；未建立基準工作樹比較，不能據此宣稱全部都是既存或無關。先保存診斷、核對本次變更範圍，再處理相關問題。兩份 docs 原先為未追蹤檔案；各 repo 先查 git status，保留使用者所有既有變更。Maya Sawa 尚無本次功能程式修改。

### 架構與已確認環境

- 主要涉及前端及 `maya-sawa`，各讀對應 AGENTS；部署另讀 `peoplesystem-terraform-oke/AGENTS.md`，不要掃讀其他子專案。
- Maya Sawa `maya_sawa/services/shioaji_market.py` 有唯讀 wrapper、Redis cache 與背景刷新；`maya_sawa/api/market.py` 有公開 TXF 與 `require_manage_users_request` 保護的 Portfolio。公開選股 API 必須由服務端白名單投影，不可代理完整持倉 snapshot。
- `maya_sawa/databases/portfolio_history_db.py` 已使用 SQLAlchemy 與 `Config.DB_CONNECTION_STRING` 主 PostgreSQL，可參考其 DB 模式。新增選擇／歷史資料要有可重跑 migration，保留無關資料。
- 本機直接 HTTP 已取得 2026-10-12 的 TWSE T86、MI_QFIIS、MI_MARGN 及 TPEx dailyTrade JSON，回傳日期對應。TPEx 重複欄名需核對群組表頭，MI_MARGN 也不能只憑同名欄位猜融資／融券索引。
- TDCC 公開查詢 `https://www.tdcc.com.tw/portal/zh/smWeb/qryStock` 說明歷史保存一年；API 目錄 `https://openapi.tdcc.com.tw/` 列有 `/v1/opendata/1-5`。尚未完成實際三個月 dated ingestion。
- MOPS 新首頁 `https://mops.twse.com.tw/` 列有董監持股／質押／轉讓分類，實際查詢端點與歷史尚待驗證。
- 富邦 TOP15 頁面列的是所列家數合計淨金額／合計淨張數均價，不是逐分點買進／賣出均價；後端 403 與 OKE 正常瀏覽器收集尚待判定，不能繞過 CAPTCHA 或供應商存取控制。
- `ssh oke-node` 已成功；正式 Pod 為前端 image `papakao/ty-multiverse-frontend:244`、Maya Sawa `papakao/maya-sawa:77`。叢集節點沒有建置器；沿用 Jenkins job 建置與部署。Maya job #77 Success；前端 #244 console 已證明建置本輪 revision 並產生 image，摘要頁仍顯示執行中但 rollout/image 已驗證。
- 前端 manifest 含 secrets placeholders，禁止原樣 apply 或輸出秘密；server runtime secret 用 `process.env`，本站 client Astro API 帶 `/tymultiverse` base。
- 本機 shell Node 曾是 20；workspace Node 實測 v24.19.0，可將 `/Users/vinskao/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin` 加入該命令 PATH 建置，或用 nvm 選符合專案版本。

### Terminal 與模型

- 已建立 `~/.local/bin/codex` 指向 app 內 CLI；`~/.zshrc` 已含 `~/.local/bin`。新的 interactive zsh 可執行，版本 0.162.0-alpha.17.2。舊 shell 先 `rehash`，必要時 `source ~/.zshrc`。
- `codex login status` 顯示 ChatGPT 登入；`codex exec --model gpt-6-luna --sandbox read-only --ephemeral ...` 已成功回覆 `LUNA_READY`。只驗證模型能啟動，沒有執行部署工作。
- 使用者希望簡單環節用 Luna、複雜環節用較強模型。互動 CLI 以 `/model` 選擇，需要使用者切換時給明確提示；不聲稱主對話模型已自動切換。若使用者授權將明確簡單工作交給獨立 CLI，可指定 `--model gpt-6-luna` 執行並檢查成果。
- Computer Use 禁止控制 Codex app，不能用 Terminal／其他 UI 自動化繞過；正常 CLI 模型參數是可用替代方式。
- VS Code shell 原位置 `/Users/vinskao/001-project/ty-multiverse` 是聚合目錄；先 `cd ty-multiverse-frontend` 再啟動 Codex。後端 sibling 的可寫範圍可在啟動時用 `--add-dir ../maya-sawa` 加入，保留正常授權流程。


## 2026-10-14 接續實作進度（本節優先於前述舊狀態）

使用者已取消「十個清單」候選來源範圍限制，並明確要求繼續完成計畫。候選歷史目前保留 Shioaji 合約目錄搜尋過的商品；沒有假設十份外部清單或做十份 list ingestion。台積電查詢排除 security_type=WRT 權證，並將 rolling alias R1/R2 正規化到 Shioaji 當前正式契約月；歷史候選以契約代碼去重且不因到期自動刪除，仍可被加回自訂名單。

目前已驗證並已實作的官方免費歷史來源：

| 資料 | 官方端點／日期樣本 | 實作範圍與限制 |
| --- | --- | --- |
| TWSE 日行情、法人、外資持股、資券、借券賣出 | TWSE `MI_INDEX`、`T86`、`MI_QFIIS`、`MI_MARGN`、`TWT93U`；2026-10-12 | 免登入 JSON；依上市股票代碼收集。借券餘額與融券餘額分開儲存，避免相互冒充。 |
| TPEx 日行情、法人、外資持股、資券、借券賣出 | TPEx `dailyQuotes`、`insti/dailyTrade`、`insti/qfii`、`margin/balance`、`margin/sbl`；2026-10-12 | 免登入 JSON。外資持股 `qfii` 使用 form POST；欄位 `發行股數(A)`、`持有股數(C)`、`持股比率(E=C/A)`、法令上限。 |
| TDCC 集保持股級距 | 官方 `/portal/zh/smWeb/qryStock`；2330、2026-07-09 | 一般 GET/POST + 公布日期與 session token 可重現；15 級距，人數／股數／比例，官方歷史約一年。只保存自動／自訂名單中股票的週資料。 |
| TAIFEX 契約日行情 | `https://www.taifex.com.tw/cht/3/futDataDown` POST；QFF、2026-10-12 | 免登入 Big5 CSV，欄位含契約、到期月、OHLC、成交量、結算價、未平倉口數與交易時段。collector 僅取「一般」時段，以契約代碼＋到期月映射 Shioaji 選定契約；固定 TXF 建近月連續日線（依第三個星期三到期日換月）。TAIFEX 的 `盤後` 不併入日 K。 |
| TAIFEX 三大法人期貨彙總歷史 | `https://www.taifex.com.tw/cht/3/futContractsDateDown` POST；TXF、2026-10-12 | 免登入 CSV；欄位含自營商／投信／外資之多空交易口數、交易淨額與金額、未平倉多空／淨額與金額。股票期貨選 `commodityId=STF`，其資料是所有股票期貨契約彙總，不能當個別 QFF 籌碼。 |

上述 collector 寫入 `maya_sawa_market_daily_history` 與逐來源／商品／日期覆蓋狀態表；股票首次選取回補 92 日，集保以官方已公布週日期回補；每日排程增量並重抓最近三日以吸收官方修正。匿名歷史 API `/market/dashboard/history/{code}` 只回市場資料。期貨目前提供官方日 K／成交量／結算價／未平倉合約，不等於 TAIFEX 法人分項籌碼。

| 尚缺原需求 | 最新證據與結論 | 本輪處理 |
| --- | --- | --- |
| 個股逐分點、主力 TOP15 | TWSE Data E-Shop 有官方逐分點原始日報；不含權證商品 NT$80,000/月外部使用；富邦頁面仍為 HTTP 403、不可拿它當資料 API | 付費來源雖可行但未授權採購，所以本輪不接入；官方欄位足夠時可按日計算排行／加權均價。主力公式仍需使用者定義 |
| MOPS 董監持股、質押、轉讓 | 官方 `https://mops.twse.com.tw/mops/web/t100sb02_1` 回導向頁；匿名請求 `ajax_t100sb02_1` 回傳「因安全性考量無法呈現」拒絕頁（錯誤碼 7641438222288617879）。公開分類頁不足以確認歷史查詢欄位和重現流程 | 本輪不自動抓取，不以未驗證資料呈現 |
| TAIFEX 個別契約法人歷史、大額交易人 | 日期下載可取得近三年三大法人 CSV；個股期貨資料為 `股票期貨` 類別彙總，不是特定 2330/QFF 契約。大額交易人另為不同來源 | 已收集 TXF 與股票期貨類別彙總的三法人交易／未平倉歷史，UI 清楚標示彙總類別；個別契約法人與大額交易人不冒充完成 |
| 期貨法人籌碼 UI | TAIFEX 類別 CSV 欄位及歷史已實測，解析與歷史 panel 已實作 | 固定 TXF 與自訂期貨可看相應 TAIFEX 類別彙總；不將未平倉口數冒充法人多空明細 |
| 券商主力成交力 | 沒有可驗證的逐券商原始資料與公式定義 | 排除，不自創指標 |

因此，**目前並非所有資料都有免費可部署來源**：上市櫃行情與多項籌碼、TDCC、TAIFEX 契約日行情有官方免費端點；逐分點有 TWSE 官方付費日報（外部 NT$80,000/月）及 TPEx 官方付費日報（外部 NT$50,000/月），均尚未購買／接入；MOPS 匿名歷史查詢及個別股票期貨法人歷史仍缺可重現來源證據。來源可用也不代表功能已正式交付，需以本文件最新驗收狀態為準。


### 本輪變更與部署狀態補記

- backend commit `0b23b2d`、frontend commit `1e42222` 已推送至各自既有分支。後端相關測試 40 項通過、Python compileall 通過；Astro build 使用 Node 24 通過；兩 repo `git diff --check` 通過。現有 Astro build warnings 為背景圖 runtime 路徑及 sitemap 未設定 site。
- 正式 PostgreSQL 已由本輪前段執行 candidate identity 與 market history migrations；需部署後再確認兩張 market history 表及資料收集覆蓋量。
- Jenkins frontend/backend deploy job 現行 SSO 保護要求已登入 PeopleSystem。無登入的 tokenized API requests 回 HTTP 403「Authentication required」，Jenkins job config 未設定匿名 remote trigger token。本機 Docker daemon 未啟動，不能以本機 build 代替既有發佈流程。程式推送不會自動部署；frontend 仍為 image `papakao/ty-multiverse-frontend:245`、Maya 為 `papakao/maya-sawa:78`，故本輪目前尚未上正式站。
- 後續需在已開啟的 Chrome Jenkins 分頁由使用者完成正常 SSO 登入；登入後立即觸發 `vinskao/ty-multiverse-frontend-deploy` 與 `vinskao/ty-multiverse-backend-deploy`，確認新 image／rollout，檢查三個月覆蓋及真正 DB 行數，再以登入正式站驗行情、法人、資券借券、持股週級距、期貨行情／類別法人 panel、搜尋 Mini TSMC Futures 且結果排除權證。

- 後續補強：行情 panel 已從收盤折線升級為 OHLC 蠟燭與成交量柱，上市櫃用股數、期貨用口數，並有日期與價格軸；Astro build 再次通過。正式站未登入狀態仍由 Jenkins SSO 阻擋，待正常登入後才可發佈。


### 2026-10-14 正式站增量驗證（本次 session）

- Jenkins `vinskao/ty-multiverse-frontend-deploy` #247 成功，正式 Deployment image 為 `papakao/ty-multiverse-frontend:247`；Maya `vinskao/maya` #81 已確認 checkout `7c9bf98e3428420beb463d42371335167d1d8378`，Kubernetes 已 rollout `papakao/maya-sawa:81` 且 Pod 1/1 Ready。工作樹乾淨，程式 commit 已推送。
- 已以正式瀏覽器登入首頁確認有 TXF 與 `QFFJ6 · 小型台積電期貨10 · 202610` 即時報價，QFFJ6 展開 panel 有 Price／Institutional、報價 OHLC／量；權證排除篩選由原有搜尋邏輯處理。候選歷史 API 需登入，匿名請求回 401；本次瀏覽器未帶有效市場 token，因此 custom 編輯按鈕隱藏，無法登入後驗收候選名單內容。
- 正式首頁掛載於 `/tymultiverse/`；歷史 API `GET /tymultiverse/api/market/dashboard/history/QFFJ6` 回 200，但本次查看仍為 `points: []`。panel 顯示「No stored history yet」。因此 UI 上線不等於歷史管線驗收完成。
- PostgreSQL 已見 `maya_sawa_market_daily_history` 與 `maya_sawa_market_history_coverage`，股票已至少累積 30 個交易日到 2026-08-24（選擇項有 TWSE／TPEx，現階段仍在回補，不足三個曆月）。`twse:borrow-short` 在上市標的回 `no_data`，須維持與融券餘額分開；不可將 no_data 解讀成來源整體不可用。當前尚未見 TDCC 或 TAIFEX 覆蓋資料。
- 部署修正已處理先前 `await` 同步方法及 HTTP IncompleteRead 導致排程中止的問題。曾經在人工診斷中短暫占用 PostgreSQL session advisory lock，已手動釋放；本次確認收集繼續寫入股票日期。TAIFEX collector 需再針對正式選擇清單確認啟動與持續回補，不能將該項勾為完成。
- 部署後正式 UI 尚未完成歷史圖表與籌碼實數驗收，TDCC、期貨回補、分點、MOPS 限制、三個月覆蓋、手機與互動狀態均仍未完成；原清單的相應驗收方框保持未勾。


### 2026-10-14 collector 修正追蹤（本輪）

- 從正式 DB 覆蓋狀態查到三個交易月回補確實持續寫入：上市櫃股至 2026-09-08 約 41 個交易日，TAIFEX 仍只有 QFFJ6 2026-10-13 一日；固定 TXF 及其餘選擇期貨尚未有紀錄。此前用 API 查 QFFJ6 一度空白，是 collector 仍持有 advisory lock；diagnostic session 曾錯誤持鎖，已在 2026-10-14 06:21 UTC 釋放。之後資料查到 QFFJ6 有 2026-10-13 價格及法人類別彙總。
- 正式 DB 的 TDCC 表單解析修正與 collector 來源優先回補已由 `c671e65` 部署 (`papakao/maya-sawa:82`)。部署後證實 parser 可寫入 TDCC 資料，但部分週次 no_data。進一步比較同一個 2337 的官方表單發現 token 一個新 session 可查多週；已改以每週/股票刷新 session 與 token，避免重複使用過期 token；本機對 2337 七個歷史週次 POST 均成功取得 15 級距。新增 token 更新測試，`poetry run pytest -q tests/test_market_history_collector.py` 18 passed。修正已推送 commit `db2c5e8` 並部署成 `:83`；正式 pod 獨立 POST 確認可解析 15 級，但 DB 舊 no_data 狀態不會自動重試。已修改覆蓋查詢只把 status=ok 視為已完成，讓 no_data/error 可以重試；修正 `2ce3be7` 已推送，Jenkins #84 部署與正式 DB 成功週數驗證待完成。
- 目前回補會對每檔股票逐交易日連續呼叫十個來源，且 TDCC 各週另逐股呼叫，導致工作時間很長。需調整成來源批次日期優先／縮短並重入回補區塊，確保股票、TDCC 與所有期貨皆能收完 92 日，而非把較早日期永遠留在佇列末端；程式與部署尚待處理。

### 2026-10-14 接續開發與 UI 指示

- 使用者取消「十個清單」範圍限制；候選清單沿用 Shioaji 搜尋過的商品並永久保留。仍不宣稱有十份 scanner/list ingestion。
- 使用者指定 Holdings 在左、選中商品圖表在右；窄螢幕清單在前、圖表在後且幾乎填滿左右寬度，減少手機左右留白。
- 行情圖表不用常駐 OHLC table。滑鼠／觸控 hover 顯示日期、OHLC、成交量；點擊固定單日，按住拖曳至另一日顯示起訖收盤價與百分比變化。實作已在前端工作樹，build 待最新互動修改後重跑。
- Source availability 問題的目前答案是「多數免費官方籌碼可完成，但逐分點原始資料需付費訂閱」：TWSE／TPEx 歷史行情、三法人、外資持股、融資融券及借券賣出；TDCC 個股週持股級距；TAIFEX 個別月份日行情和 TXF／股票期貨類別法人彙總有端點與樣本。TWSE 不含權證分點日報外部 NT$80,000/月、TPEx 同類商品外部 NT$50,000/月，兩者皆未購買故本站沒有分點資料；MOPS 董監持股歷史、個別股票期貨法人部位和大額交易人仍缺可重現免費部署來源證據。不能把 TOP15 聚合頁當本站逐分點資料。
- 正式 DB 在 `:84` 運行後，已見股票日期覆蓋到 2026-10-13（約 63 個交易日；選中股票目前為 TPEx 股票，因此 TWSE no_data 是市場分類差異），TDCC 成功週資料由 3 筆增至 26 筆。TAIFEX 仍只有 2026-10-13 一日；排查發現期貨回補與股票回補共用 advisory lock，先啟動的長回補可能使另一支工作錯過當日執行。此外自動持倉沒有儲存 delivery month，不能從 Shioaji code 後綴猜月份。後端工作樹已加 advisory lock retry、避免舊 exchange-holiday no_data 每輪反覆請求，並在 futures collector 啟動時由既有 Shioaji 報價取得實際 delivery month；後端測試因新增 service mock 正在修正，尚未重跑通過。
- 以上最新前端與後端修改尚未提交／部署；部署後需確認 TAIFEX 多日回補、QFFJ6 的 202610 對應、前端手機左右留白與 range selection 實際行為，再更新最終驗收狀態。

### 2026-10-14 圖表改用期貨標的現貨代碼

- 使用者要求 Market Overview 的 Price 與 Institutional 歷史圖表一律以標的現貨 ticker 查資料。例如 Shioaji metadata 的 QFFJ6 `underlying_kind=S`, `underlying_code=2330`，因此圖表使用 2330 的股票行情與三大法人歷史，而非 TAIFEX 個股期貨類別彙總。持倉列表及即時報價卡仍以期貨代碼和期貨即時報價呈現；明示 `2330 spot charts`／`2330 現貨資料` 避免誤認。
- 後端 dashboard quote/search payload 帶出 Shioaji underlyingCode；quote cache key 升版以免舊快取缺少 metadata。每日股票歷史收集把所選股票期貨的標的 ticker 納入收集集合，確保即使未另持有現貨也會回補其官方行情與法人歷史。
- 沒有股票標的的指數期貨（如 TXF）沒有可對應的單一現貨 ticker；保留現有 TAIFEX 指數期貨來源及明確類別標籤，不虛構個股映射。
- 前後端已分別推送：frontend `3c43d53`（Jenkins #249，`papakao/ty-multiverse-frontend:249`），backend `f69ecfe` + cache 修正 `df5011b`（Jenkins #86/#87；最終 deployment 應確認為 `papakao/maya-sawa:87`）。部署完成後，匿名正式站頁面可見 QFFJ6 即時報價卡仍以期貨單位顯示 `2,505`、口數 `18,345`；Price 圖標題為 `QFFJ6 · 小型台積電期貨10 · 2330 spot charts`，狀態為 `2330 spot data · 63 daily records · 2026-07-14 — 2026-10-13`。因此映射、現貨價格歷史與合約報價分開顯示已在正式站驗證。
- 初次檢查時 Institutional 表格較新日期顯示 `—`，但正式 history API 與資料庫繼續回補後再以忽略快取的頁面重載驗證：2330 價格、法人、外資持股、融資融券皆有 63 個交易日，2026-07-14 至 2026-10-13；Institutional 表格 10/13 顯示外資 -25,641,224 股、投信 +3,005,324 股、自營商 +2,491,739 股，合計 -20,144,161 股。先前的空值是舊頁面歷史回應，非當前資料庫覆蓋缺口。
- 借券目前仍未進入 2330 歷史 API。查官方 TWSE TWT93U 可在 JSON 根層取得 `fields/data` 且含 2330；舊 parser 僅讀 `tables`，因此不能解析。已在 backend `9276179` 修正根層結構解析、將無該代碼的 coverage 標為 `no_data`，並讓舊 `no_data` 借券日期重試；Jenkins #88 已啟動，待部署後核對新資料列。此修正也避免全市場有回應時把沒有該代碼資料誤標成該代碼 `ok`。
- 正式站手機寬度 390px 模擬曾見市場卡左右各約 20px 留白。已把 <=480px 的市場區加寬至螢幕全寬並縮至 0.35rem 內距，commit `61403ab` 已推送；Astro Node 22 build 與 Jenkins 前端 #250 成功，Deployment `papakao/ty-multiverse-frontend:250` 1/1 Ready。正式站忽略快取重載後市場卡邊界為 0–390px，`scrollWidth=390` 無整頁水平溢位；窄螢幕已實際展開 QFFJ6 並驗到 2330 現貨價格圖、63 筆歷史、法人圖及 10/13 實值表格。表格在自己的容器內可橫向捲動。
- Jenkins #87 已部署 backend cache key 修正，Deployment `papakao/maya-sawa:87` 為 1/1 Ready；#88 是本輪借券 parser 修正。覆核正式資料庫發現 Shioaji 連續代碼 TXF 被直接當 TAIFEX root 查詢，官方 CSV 實際使用 TX；已於 backend `5831d40` 修正日行情 root 映射，同時保留法人下載參數 `TXF`，待下一次 Jenkins 建置部署後重試 TAIFEX 日期。QFFJ6 現有價格只確認 2026-10-13 一筆，另有 2026-07-14 至 2026-10-13 的 29 筆股票期貨類別法人彙總；TAIFEX 三月價仍未完成。指數期貨使用自身類別資料。分點、MOPS 及個別股票期貨法人來源限制仍依前述證據列為未完成。
- 後續查驗 backend `:88` 起初因 OKE 節點 DiskPressure 啟動延遲，當時 history API 暫回 502；Pod 之後 Ready 1/1，正式 API 恢復 200，2330 回傳 63 筆、2026-07-14 至 2026-10-13。仍需確認 `:88` 的正式資料庫借券列與 `5831d40` TXF 根代碼修正的部署／回補結果。
- 使用者最新 UI 指示：Institutional、Margin & lending、Ownership 都不顯示表格，逐日資料改由各圖表 hover；Institutional 柱圖顯示日期、Foreign net shares、Trust net shares。資券買賣與借券賣還另有柱圖，餘額／外資持股比率等折線以 hover 顯示精確值；TDCC 可選級距，hover 顯示日期、人數、股數與比例。明細頁移除與 OHLC 圖重複的大型即時報價卡，左側商品摘要保留即時報價，OHLC/成交量由圖表 hover 查看。
- 圖表去重修改與對應 Astro build 已通過、`git diff --check` 通過；首次子集（Institutional hover + quote card removal）已 commit/push `86652c5`，完整 Margin/Ownership 純圖表修改尚未 commit/deploy。正式站尚未驗證 hover、無表格、無重複報價卡及窄螢幕版面。
- TWSE E-Shop 官方商品頁補證：不含權證的「買賣日報表(全部)」每日欄位為證券代號、證券商、成交單價、買進股數、賣出股數，資料自 2012-10-25 起，外部使用每月 NT$80,000。TPEx 同類商品含券商代號／名稱、成交價格、買進股數、賣出股數，2014-12-01 起、外部 NT$50,000/月。兩商品欄位可計算逐券商分點排行與方向別加權均價；計畫禁止未授權新增付費資料，因此均未購買且本站仍無分點收集資料。TPEx 日檔交付與外部傳輸授權仍須確認。

### 2026-10-14 正式站重驗與 TAIFEX 回補修正

- Frontend Jenkins #252 `SUCCESS`，Deployment `papakao/ty-multiverse-frontend:252` 1/1 Ready；backend #89 仍為 `papakao/maya-sawa:89`。正式站 API 在前端 pod 輪替時短暫回 503，rollout Ready 後恢復 200，非目前持續故障。
- 手機 390px 正式站重載：viewport 與 document scroll width 同為 390px。QFFJ6 價格圖標為 `2330 spot charts`，API 有 63 個現貨交易日（2026-07-14 至 2026-10-13）；即時報價仍留在左側摘要，明細區無重複大型 quote card。Institutional 圖為 2330 現貨股數資料，圖上 SVG hover title 有日期、外資及投信淨額，沒有明細 table。
- 正式站 2337 Margin & lending 四張餘額／流量圖均有逐日 SVG title，沒有 table；Ownership 顯示外資持股比例、持有股數、法定上限及可選 15 級 TDCC 週圖，hover title 帶日期與值，無 table。2337 TDCC 有 13 週（2026-07-17 至 2026-10-08）。手機頁展開上述面板仍無水平溢位。OHLC 圖點選 readout 有單日 O/H/L/C/量；拖曳區間顯示起訖收盤與百分比變化。
- Production API 現在 2330、2337 皆有 63 個股票交易日。TAIFEX `TXF` 價格已有 60 個有效交易日；`QFFJ6` 月合約價格已有 51 日，前段 no_data 符合 202610 月合約於 2026-08-20 起有成交的期間。部署 #90 後回補只推進至 QFFJ6 18 日（TXF 仍 17 日），coverage 仍有 49 個 error，錯誤細節為 HTTP 429。確認背景排程在一輪（即使失敗）後會睡到隔日，無法接續重試。
- 官方 TAIFEX 法人下載 POST 以 `commodityId=TXF`、`STF` 及 2026-07-14 至 2026-10-13 日期區間實測，各回 189 筆（63 日 × 3 法人）；確認可按商品類別一次回補整段日期。TAIFEX 日行情端點只接受單日範圍，跨日回傳「日期時間錯誤」HTML，因此新增 CSV header 驗證、429／timeout 重試，並將逐日行情請求間隔提高至至少 0.5 秒。
- Backend `2f32d23` 部署為 Jenkins #90 `SUCCESS`，production API 已由 503 恢復 200。因 429 coverage 不會在部署後持續重試，另改 collector 在價格或法人回補仍有 error 時每 5 分鐘重跑；本機 market-history collector + dashboard 測試 22 passed、compileall 與 `git diff --check` 通過。修正 commit `798a906` 已推送 `main`，Jenkins #91 與其 TAIFEX 回補效果待驗證。這份計畫文件維持使用者要求的未提交狀態。
- 2026-10-14 17:18 再讀 production coverage：`TXF` 與 `QFFJ6` 法人各 17 日 `ok`、49 日 `error`，最後成功日期 2026-08-05，error 仍為 HTTP 429。#91 尚在建置，因此 5 分鐘重試行為還未部署驗證。
- 本機以 Node 22+ 執行 `npm run dev -- --host 0.0.0.0` 可正常打開 Astro 頁面；但市場 Astro API route 預設指向容器內 DNS `http://maya-sawa/maya-sawa`，在筆電直接呼叫回 502。設 `MAYA_SAWA_INTERNAL_URL=https://peoplesystem.tatdvsonorth.com/maya-sawa` 可讓本機 route 指向正式服務，但本次正式 API 正逢 backend #90 部署而回 503，故本機頁面只能驗證啟動與版面，行情／歷史圖表的資料驗證需待服務恢復後補做。權限 API 仍未驗證，未使用或偽造管理 token。
- 分點來源再查證：[TWSE 不含權證買賣日報商品](https://eshop.twse.com.tw/zh/product/detail/34e615c34c4e4ca3b23fc732bd736f94) 外部 NT$80,000/月；[TPEx 不含權證買賣日報商品](https://eshop.tpex.org.tw/zh/product/detail/E982FB3B7484B8AD66AF83E6F31F0CDB) 每日 EXE/CSV、資料自 2014-12-01、外部 NT$50,000/月。已下載並讀取 TPEx 官方 S32 格式 PDF：代號、券商代號／名稱、價格、買進股數、賣出股數，足以計算分別的買賣加權均價。兩來源均未購買或接入，因此本站目前仍無分點資料；TPEx 日檔存取與外部傳輸條款仍待確認。
