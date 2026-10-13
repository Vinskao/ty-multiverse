# 首頁市場儀表板與 About 語系修正計畫

規格日期：2026-10-13。以下納入同日晚間使用者最新指示，優先於本文件舊規則及 `PLAN_TO_PRODUCTION_WORKFLOW.md` 的歷史紀錄。

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
| 5 | TDCC、MOPS | 有公開查詢入口；不可先保證所有介面免登入且自動化可用 | 尚待實際端點、三個月歷史及部署環境查證；舊 MOPS URL 已導向錯誤頁，需找新入口 |
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
| TAIFEX 法人與大額交易人 | 延後，本輪不顯示 | 官方 OpenAPI Swagger 列有相關資源；既有 TXF 樣本為 2026/07/13 | 公開下載；未驗證個股期貨涵蓋、休市及近三月逐日回補 | 不從 TXF 單一樣本推廣至全部期貨 |
| TDCC 集保級距 | 納入每週最新資料源；本輪尚未實作 | `/v1/opendata/1-5`，樣本日期 2026-10-08 | 15 個持股級距、股數、人數、占集保庫存比例；週報 | 公開 OpenAPI 免登入；此 endpoint 樣本只證明最新週，不證明三月歷史可自動讀取 |
| MOPS 董監持股／質押／轉讓 | 延後，不展示 | 官方 MOPS 有相關分類；本輪未驗證可重現端點及日期 | 欄位、頻率及歷史範圍未核實 | 未查證不等同缺資料；完成端點驗證後再納入 |
| 分點、主力與逐分點均價 | 排除本輪 | 富邦既有網頁樣本列 TOP15 聚合數；後端 HTTP 回 403 | 非逐分點買進／賣出均價；本站未定義券商「主力」對應公式 | 不繞過存取控制；未證明可部署使用的官方免費 API |
| Shioaji 三個月 K 線歷史 | 延後，本輪不回補 | [官方歷史行情文件](https://sinotrade.github.io/zh/tutor/market_data/historical/) | 文件描述單次區間上限與 API 頻寬使用 | 尚未實作分段回補及額度監控，不能用即時 snapshots 冒充歷史行情 |
| 固定 TXF、自訂五格 | 納入本輪應用功能 | Shioaji 合約目錄及 Redis 行情 | 開高低、成交量、時間與漲跌 | 沿用既有 Shioaji session |

本輪程式已落地公開安全的自動五大標籤快照、管理員自訂設定 PostgreSQL 表、合約搜尋與即時行情 proxy。TWSE／TPEx JSON 僅驗證端點樣本，尚無籌碼歷史 collector、三月回補、來源日報資料表或歷史 UI。上表標註後續／延後者不算本輪交付。

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


## 來源定案紀錄規則

接續執行者須在本文件維護決策表：`指標／商品範圍／納入或排除／端點與樣本日期／欄位及單位／歷史頻率／存取與費用／證據及理由`。所有待查證項目須收斂為納入或排除；暫時 HTTP 失敗不能直接證明資料不存在。核心選股、五大部位、管理員設定、PostgreSQL、既有行情與 About 不因其他籌碼源不足而整組排除。

## 正式站驗收清單

- [ ] 每項來源已明確納入／排除並附證據，沒有未查證項目假裝已完成。
- [ ] 固定近月台指期、自動五大及管理員自訂完成；每個新有效快照更新，失敗快照不清空舊有效選擇。
- [ ] 後端搜尋、商品身份／到期月份、重複檢查、五格上限、排序及 PostgreSQL 持久化完成；重啟後設定保留。
- [ ] 納入資料完成三個曆月回補、累計所需前置資料與每日增量；來源日期、單位、唯一鍵、任務狀態及 DB 筆數可核對。
- [ ] 相關授權／資料完整性測試與 build 通過；既存不相關檢查錯誤需明列，不能宣稱所有檢查通過。
- [ ] 各變更服務以新不可變 image 部署，migration、rollout、實際 Pod image/digest 已驗證，保留前版與回滾方式。
- [ ] 正式站匿名可讀公開市場資料；API 不含帳戶資訊；匿名／非管理員無法修改設定或讀受保護 Portfolio。
- [ ] 真實瀏覽器登入使用者帳號後確實看到五大部位；與有效服務端快照核對，不輸出 token、帳密或持倉金額。若遇必須由使用者操作的登入／2FA，指出具體頁面與步驟，等待完成後接續驗證。
- [ ] 桌面／手機、摘要展開、適用分頁、搜尋新增移除、五格上限、重新整理、深淺主題及 View Transitions 通過。
- [ ] About 直接中文／英文 URL、儲存語系衝突、切換與離開返回均通過，標題與標籤翻譯一致。
- [ ] AI Token Usage 緊接市場區下方且全寬；既有 Portfolio 保護有效。
- [ ] 回報正式站 URL、image/digest、資料覆蓋、登入後 UI 驗證證據及排除項目後才結束。

## VS Code 接續狀態（不代表功能完成）

### 未提交程式與驗證狀態

本輪修改前端 About 語系、全寬市場清單、自動五大及管理員自訂 UI、公開與受保護 API proxy；後端新增自動五大標籤快照表、管理員自訂表、SQL migration、公開儀表板與合約搜尋 API。歷史籌碼 collector、三月回補、日行情資料庫與歷史圖表尚未實作，依來源表延後。

About 已改用完整 URL reload，缺省語系正規化為英文；直接語系 URL 尚待正式站驗證。後端相關測試 37 項通過，前端 build 通過。`astro check` 全專案先前曾列 206 項錯誤；正式站尚未部署本輪改動或驗證登入後五大部位。

全專案 `astro check` 曾回報 206 項錯誤；未建立基準工作樹比較，不能據此宣稱全部都是既存或無關。先保存診斷、核對本次變更範圍，再處理相關問題。兩份 docs 原先為未追蹤檔案；各 repo 先查 git status，保留使用者所有既有變更。Maya Sawa 尚無本次功能程式修改。

### 架構與已確認環境

- 主要涉及前端及 `maya-sawa`，各讀對應 AGENTS；部署另讀 `peoplesystem-terraform-oke/AGENTS.md`，不要掃讀其他子專案。
- Maya Sawa `maya_sawa/services/shioaji_market.py` 有唯讀 wrapper、Redis cache 與背景刷新；`maya_sawa/api/market.py` 有公開 TXF 與 `require_manage_users_request` 保護的 Portfolio。公開選股 API 必須由服務端白名單投影，不可代理完整持倉 snapshot。
- `maya_sawa/databases/portfolio_history_db.py` 已使用 SQLAlchemy 與 `Config.DB_CONNECTION_STRING` 主 PostgreSQL，可參考其 DB 模式。新增選擇／歷史資料要有可重跑 migration，保留無關資料。
- 本機直接 HTTP 已取得 2026-10-12 的 TWSE T86、MI_QFIIS、MI_MARGN 及 TPEx dailyTrade JSON，回傳日期對應。TPEx 重複欄名需核對群組表頭，MI_MARGN 也不能只憑同名欄位猜融資／融券索引。
- TDCC 公開查詢 `https://www.tdcc.com.tw/portal/zh/smWeb/qryStock` 說明歷史保存一年；API 目錄 `https://openapi.tdcc.com.tw/` 列有 `/v1/opendata/1-5`。尚未完成實際三個月 dated ingestion。
- MOPS 新首頁 `https://mops.twse.com.tw/` 列有董監持股／質押／轉讓分類，實際查詢端點與歷史尚待驗證。
- 富邦 TOP15 頁面列的是所列家數合計淨金額／合計淨張數均價，不是逐分點買進／賣出均價；後端 403 與 OKE 正常瀏覽器收集尚待判定，不能繞過 CAPTCHA 或供應商存取控制。
- `ssh oke-node` 已成功；本輪重查前端 image `papakao/ty-multiverse-frontend:243`、Maya Sawa `papakao/maya-sawa:76`，對應 Jenkins job #243／#76。叢集節點沒有建置器；本機 Docker Desktop server 可辨識為 linux/aarch64，但 sandbox socket 權限拒絕。已登入 Jenkins 視窗可查詢前端與 Maya 專用部署 job。
- 前端 manifest 含 secrets placeholders，禁止原樣 apply 或輸出秘密；server runtime secret 用 `process.env`，本站 client Astro API 帶 `/tymultiverse` base。
- 本機 shell Node 曾是 20；workspace Node 實測 v24.19.0，可將 `/Users/vinskao/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin` 加入該命令 PATH 建置，或用 nvm 選符合專案版本。

### Terminal 與模型

- 已建立 `~/.local/bin/codex` 指向 app 內 CLI；`~/.zshrc` 已含 `~/.local/bin`。新的 interactive zsh 可執行，版本 0.162.0-alpha.17.2。舊 shell 先 `rehash`，必要時 `source ~/.zshrc`。
- `codex login status` 顯示 ChatGPT 登入；`codex exec --model gpt-6-luna --sandbox read-only --ephemeral ...` 已成功回覆 `LUNA_READY`。只驗證模型能啟動，沒有執行部署工作。
- 使用者希望簡單環節用 Luna、複雜環節用較強模型。互動 CLI 以 `/model` 選擇，需要使用者切換時給明確提示；不聲稱主對話模型已自動切換。若使用者授權將明確簡單工作交給獨立 CLI，可指定 `--model gpt-6-luna` 執行並檢查成果。
- Computer Use 禁止控制 Codex app，不能用 Terminal／其他 UI 自動化繞過；正常 CLI 模型參數是可用替代方式。
- VS Code shell 原位置 `/Users/vinskao/001-project/ty-multiverse` 是聚合目錄；先 `cd ty-multiverse-frontend` 再啟動 Codex。後端 sibling 的可寫範圍可在啟動時用 `--add-dir ../maya-sawa` 加入，保留正常授權流程。
