# 總體經濟資料與公布提醒完整計畫

規格及來源查證日期：2026-10-15（Asia/Taipei）。

版本：v5，實作中。正式環境必須使用 BLS 與 FRED 各自的 API key，皆存 Jenkins。BLS registered API 提供數值，FRED registered JSON API 提供非農／CPI 公布日期與目標利率序列；公開 HTML 日曆只補充公布時刻，不取代 keyed API。兩筆 key 均已存入 Jenkins；FRED keyed API 已從正式 Maya Pod 驗通，詳見第 15 節。

使用者已授權開始實作。此文件繼續記錄來源規格與驗收要求；程式已在本機工作樹，不代表已部署。先前各節「FRED key 尚未建立」為歷史查證狀態，已由第 15 節取代。來源連線已驗通，持久化、排程與正式畫面仍須部署驗收。

## 1. 目標與位置

首頁市場總覽內，依序為：總體經濟 → 持股籌碼摘要 → 近期公司事件 → 持倉／觀察表與明細。

總經區整合「最新公布數值」與「下次公布日程」，讓使用者知道目前資料屬於哪個月份、何時有下一筆重要數據，以及公布後數值是否確實更新。近期提醒共用公司事件的視覺語意，但總經事件是市場層級，沒有特定公司代碼；不將總經事件假裝成某家公司公告。

## 2. 已實際查證的資料來源

以下區分本機 HTTP 實際結果、官方文件確認與部署環境尚待驗證。HTTP 200 須再檢查應用層狀態與資料欄位。免費來源仍採後端集中更新，不能由每個訪客重複呼叫上游。

| 來源／介面 | 查證結果 | 用途與決策 |
| --- | --- | --- |
| `GET https://api.bls.gov/publicAPI/v2/timeseries/data/{seriesId}` | 非農、失業率、CPI、核心 CPI 四次請求皆 HTTP 200、`REQUEST_SUCCEEDED`，有 2026/M09 資料 | 官方免費數值來源，無金鑰實測成功 |
| `POST https://api.bls.gov/publicAPI/v2/timeseries/data/` | 本機無 key 批次成功；正式 `deploy/maya-sawa` 帶已註冊 key 請求 HTTP 200、`REQUEST_SUCCEEDED`，六個序列各取得 2024/01–2026/09 共 33 個月 | 第一版採 registered API 批次取得，不逐序列輪詢 |
| `https://www.bls.gov/schedule/news_release/empsit.htm` | 官方頁面可由研究瀏覽工具讀到月份、日期、08:30 AM；本機與正式後端皆 HTTP 403 | 原始公告來源，作人工交叉核對，不列為自動抓取依賴 |
| `https://www.bls.gov/schedule/news_release/cpi.htm` | 官方頁面可讀到月份、日期、時間；本機與正式後端皆 HTTP 403 | 同上，CPI／核心 CPI 共用公布事件 |
| `https://www.bls.gov/schedule/news_release/bls.ics` | 本機與正式後端皆 403，`data.bls.gov` 對應日程路徑亦 403 | 排除第一版自動來源，403 不快速重試 |
| `https://fred.stlouisfed.org/releases/calendar?rid=50&vs=2026-10-15&ve=2026-12-31&ob=rd` | 正式後端 HTTP 200，解析出 11/06、12/04 Employment Situation，皆 7:30 am；頁尾明示 US Central Time | 已驗證的研究／時刻核對來源；不作正式 keyed API 的替代，也不宣稱其有註冊 API 額度 |
| 同一 FRED 日曆，`rid=10` | 正式後端 HTTP 200，解析出 11/10、12/10 Consumer Price Index，皆 7:30 am | 同上；正式公布日期以帶 key 的 JSON API 為主 |
| `https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm` | 本機及正式後端 HTTP 200，官方 2026/2027 會議日程可讀 | FOMC 日期來源；兩日會議以決策日為事件日期 |
| `https://www.federalreserve.gov/newsevents/2026-october.htm` | 研究工具讀到 10/28 決策 14:00、記者會 14:30；正式後端請求 403 | 可人工核對當月時刻；尚非已驗通的自動時刻來源 |
| `https://www.federalreserve.gov/feeds/press_monetary.xml` | 本機及正式後端 HTTP 200；本機 XML 解析成功，共 15 筆，含 FOMC statement 的 link、pubDate | 確認決策已實際公布；不把所有貨幣政策新聞當成利率決策 |
| Fed 日程連結的 Implementation Note | 實測 `monetary20260916a1.htm` HTTP 200，內文含目標區間 3-3/4–4 percent 與生效日 | 解析上下限、公布日與生效日；保留官方原文連結 |
| `https://api.stlouisfed.org/fred/series/observations` | 未帶 key 的實際請求 HTTP 400，明示 `api_key is not set` | FRED JSON API 需要金鑰；目前不列為無設定即可用的依賴 |
| `https://www.financecalendar.com/wp-json/fc/v1/calendar` | 本機 HTTP 200；2026-10-15 至 2026-12-31 回傳 168 筆，含非農／CPI／FOMC日期、時間、consensus、prior、actual 欄位；目前這些未來重點事件的 consensus 為空 | 免費共識／公布值補充來源，無 key；每6小時最多抓一次並持久化，保留缺值，不以 prior 代替 consensus。服務條款要求顯示可見來源連結；共識於公布前才可能補齊，覆蓋完整度待持續觀察 |
| FRED `fred/release/dates` | 官方文件確認有日期與 `include_release_dates_with_no_data=true`；尚無 FRED key，未做成功資料請求 | 正式環境必要來源：`release_id=50`與`10`；取得 key 後須在正式後端驗通。回應只有日期，精確時刻另核對 |
| `https://fred.stlouisfed.org/graph/fredgraph.csv?id=DFEDTARL,DFEDTARU&cosd=2026-10-01` | 本次本機請求逾時 | 不能作第一版可靠來源或宣稱已驗通 |

### 已驗證的 BLS 批次請求

```http
POST https://api.bls.gov/publicAPI/v2/timeseries/data/
Content-Type: application/json
```

```json
{
  "seriesid": [
    "CES0000000001", "LNS14000000",
    "CUSR0000SA0", "CUSR0000SA0L1E",
    "CUUR0000SA0", "CUUR0000SA0L1E"
  ],
  "startyear": "2025",
  "endyear": "2026"
}
```

本次取到的欄位包括 `seriesID`、`year`、`period`、`value`、`footnotes`。`latest` 不取代年月比對；不要依陣列位置假定順序。非農有 preliminary 註記，須保留。

官方 BLS FAQ：未註冊每日 25 次、每次最多 25 序列、最多 10 年；註冊後每日 500 次、每次最多 50 序列、最多 20 年。第一版使用已保存的註冊 key，仍設定低頻保守預算。數值 API、FRED 日曆與 Fed 日期／RSS 已實際在正式後端驗通；這是只讀來源探測，不是總經功能已部署。

### 明確限制與解除方式

1. **BLS 本身的日程存取受限，正式替代方案為 FRED registered API。** 保留原始發布者 BLS 與日程提供者 FRED 兩種來源。人工匯入僅為來源故障時的應急措施，不能代替自動更新驗收。
2. **FRED_API_KEY 是正式上線必要條件。** 須免費註冊／申請獨立 key、存 Jenkins，並從正式後端成功呼叫 `release/dates` 後才可宣告來源驗收完成。不得以 BLS key 呼叫 FRED；無 key、invalid key 或429不自動改抓匿名 HTML 規避額度。HTML 時刻核對另行低頻快取，日期／時刻衝突須告警，不靜默覆蓋 API 日期。
3. **市場共識來源有免費候選，覆蓋率仍需觀察。** Finance Calendar API 免 key、文件列有 consensus/actual 欄位，並要求顯示來源連結。本機已驗證 schema；當下多筆未來事件的共識仍為 null。資料庫與介面支援保存預期值、實際值、差額、來源與更新時間；同單位數值齊備後標記「高於預期／符合預期／低於預期」。缺共識時只顯示已公布數據，不推算或拿前值代替。政策利率若是文字區間（如 hold/cut），顯示預期與結果原文，不硬套數值方向標籤。若來源持續缺少非農／CPI共識，再評估付費來源；FMP 文件有 estimate 欄位，但其免費方案並不保證每個端點可用。
4. 免費不等於保證即時。來源資料可能晚於預定公布時間，必須顯示延遲與資料時間。
5. **FOMC 精確時刻有來源精度限制。** 會議決策日可自動更新。常規 14:00 ET／記者會14:30 ET 是帶明確標籤的預期時刻；逐場有官方時刻證據後才為 confirmed。月曆後端403不阻止日期提醒，但不能宣告所有未來時刻均自動確認。

## 3. 第一版指標及數值定義

| 指標 | 原始序列／來源 | 顯示與計算 |
| --- | --- | --- |
| 非農新增就業 | `CES0000000001`（季調總非農就業人數，單位千人） | 本月水位減上月水位；主畫面顯示新增「萬人」，可切換千人；保留原始水位 |
| 失業率 | `LNS14000000` | 百分比；較前期變化用百分點 pp |
| CPI | 月增 `CUSR0000SA0`；年增 `CUUR0000SA0` | 月增用季調指數 `(本月/上月-1)*100`；年增用未季調指數 `(本月/去年同月-1)*100` |
| 核心 CPI | 月增 `CUSR0000SA0L1E`；年增 `CUUR0000SA0L1E` | 同 CPI，清楚標示排除食品與能源 |
| Fed 目標利率 | Fed 決策公告／Implementation Note | 下限–上限 %；較上次決策變化用 bp，1 個百分點 = 100 bp；公布日、生效日各自保存 |

非農、失業率歸同一 Employment Situation 事件；CPI 與核心 CPI 歸同一 CPI 事件，避免一場公布重複提醒。FOMC 決策與記者會可為同組的兩筆事件；只有官方確認的記者會才顯示。不要使用有效聯邦基金利率代替目標區間。

數值計算先以完整精度進行，最後才四捨五入；缺上月／去年同期就顯示不足資料。跳過 M13 年平均，不能當成 13 月。歷史缺月不以前一列充當上月。

後續可擴展 PCE／核心 PCE、GDP、初領失業救濟金、PPI、JOLTS、國債殖利率；本輪未逐項實測，先不列入第一版已定案來源與交付範圍。

## 4. 畫面與近期標記

- 區塊名稱「總體經濟與公布日程」，位於持股籌碼摘要上方。
- 頂部顯示最近一個重要事件、台北時間、倒數與來源狀態；無近期事件顯示下一個已確認事件。
- 最新指標卡：非農、失業率、CPI、核心 CPI、Fed 目標利率。每張有資料月份／生效日、最新數值、前值、更新時間及來源。
- 共用日程表：台北公布時間、事件、資料期間、倒數／狀態、公布值、前值、官方來源。CPI／核心 CPI 的公布值可在同列列出；窄螢幕於區塊內捲動或展開明細。
- 預設顯示未來 30 天與過去 7 天，提供 90 天篩選及已公布歷史，不限定只顯示警示列。
- 可展開最近 24 個月趨勢；X 軸為資料月份／利率生效日，Y 軸明示 %、萬人或 bp，不同單位不共用同一 Y 軸。
- 訪客與登入者皆可讀；UI 無需登入取得公開總經資料。
- 中英文、明暗主題、320/390px 手機及鍵盤互動沿用專案規則，顏色以外另有文字／圖示，不使用閃爍效果。

### 狀態與時間規則

| 條件 | 標記 |
| --- | --- |
| 距離公布 > 7 天 | 一般「預定」 |
| 72 小時 < 距離 ≤ 7 天 | 「本週公布」，柔和背景 |
| 24 小時 < 距離 ≤ 72 小時 | 「即將公布」，醒目邊框 |
| 0 < 距離 ≤ 24 小時 | 「今日／24 小時內」，最強提醒與倒數 |
| 已到預定時刻，但無新一期／新決策確認 | 「等待官方資料」，仍提醒，保留前值及其期間 |
| 確認新一期數值或新決策公布，24 小時內 | 「剛公布」，顯示公布值與前值 |
| 公布超過 24 小時 | 「已公布」，回復一般樣式 |
| 官方改期／取消 | 「已改期／已取消」，更新倒數並保留變更歷史 |
| 只有日期，沒有經確認時刻 | 「時間待確認」；只作日期提醒，不顯示精確倒數 |
| 日程或資料來源超過 freshness 門檻 | 「日程待更新／資料更新延遲」，不隱藏問題 |

時區由來源決定：FRED 日曆的 US Central Time 使用 `America/Chicago`；BLS／Fed 官方 Eastern Time 使用 `America/New_York`。DB 存 UTC，UI 轉 `Asia/Taipei`，處理美國夏令時間與台灣隔日日期，不寫死 UTC-5/-6。會議起始日、決策日、資料所屬月、實際公布時間、抓取時間不可混用。FOMC 常規 14:00 ET 僅可作有標記的預期時刻，逐場官方確認後才為 confirmed。預期時刻顯示「預計」且倒數加上「約」；只有日期時不顯示分鐘級倒數。

FRED 日曆沒有確認資料所屬月時，`referencePeriod=null`，UI 顯示「資料期間待確認」，不得直接用事件日期減一個月作正式資料。BLS 新一期數值到達並與該場公布核對後再補期間。

不因時鐘跨過預定時刻就改為已公布；不因數值未變就認定沒公布。利率維持不變仍是新的決策；新一期數值為零也有效。初次補歷史資料不觸發「剛公布」，以來源公布時間為準；只有抓取時間時顯示「新資料已取得」並標示時間精度。

## 5. 後端、持久化與快取

採現有 Maya 後端與 PostgreSQL，新增獨立總經服務及排程，前端只讀本站 API。這一區不查永豐、不使用 FinMind 額度、不與訪客數量一起增加上游請求。

建議資料表：

- `macro_series`：指標代碼、來源序列、單位、季調屬性、計算方式。
- `macro_observations`：series、資料年月／生效日、Decimal value、來源、sourcePublishedAt、firstSeenAt、fetchedAt、preliminary、payloadHash；唯一鍵為 series＋period。
- `macro_observation_revisions`：修訂前後值、被修訂期別、來源與偵測時間，保存首次值及後續修正。
- `macro_events`：來源穩定 ID、事件類型、referencePeriod、scheduledAt、sourceTimezone、timePrecision、publishedAt、status、sourceUrl、verifiedAt；同場公布只一個 group ID。
- `macro_event_revisions`：改期、取消及日程來源變更歷史；不能按日期生成唯一 ID，否則改期變成重複事件。
- `macro_fetch_runs`：來源、開始／完成時間、HTTP／應用層狀態、筆數、錯誤分類、每日請求計數與 nextRetryAt。

新資料先驗 schema、日期、單位、合理範圍，再以交易 upsert；來源出錯不清空既有資料。保留來源 provenance，不同來源互相覆蓋須有明確優先序。快取失效與 DB 提交協調，避免拿到半更新的事件／數值組合。

### 更新節奏與額度

- BLS 六序列目前每6小時批次更新。以新統計期首度出現偵測公布，歷史初次載入不標成新公布。最多60個月顯示及一年年增基期，初次回補由當年度往前6年，按年月完整性檢查歷史範圍。
- 每6小時檢查一次可在公布後數小時內亮燈，預估每日4次 BLS 批次。本站 BLS 每日呼叫上限40次，低於註冊額度500；平常更新與失敗皆計入。key缺少或遭拒時保留DB資料並報錯，不自動切匿名快速輪詢。
- 所有副本共用 DB 鎖／分散鎖、請求計數與 single flight，不能每個 worker 各用40次。配額依來源帳號與上游日界計數，並保留任意連續24小時的40次保守限制；不記原始 key 作計數鍵。超限延後，不透過 IP 輪替規避。
- Fed 日程每日一次；RSS 平常每小時一次，決策前後 1 小時每 5 分鐘一次，命中新 statement 後抓公告及實施文件並停止快速輪詢。
- FRED keyed API 每6小時抓兩個release_id及兩條目標利率序列，事件日由keyed JSON提供；時刻頁面只補充核對。每日最多預估16次 FRED API 呼叫。啟用 `include_release_dates_with_no_data=true` 取得未來事件，取最近100筆並由本站按事件日期保留前7日至未來90日；不完整回應不刪除舊事件。本站 FRED API 預算每日100次、每分鐘最多10次（本站保守上限，不是聲稱官方額度）；取得 key 時重新核對官方限制，取兩者較低值。
- FRED 抓取順序（2026-10-28）：每日預算（目前 200 次）用完時，排程會在半途停下。原本按宣告順序抓，排在最後的韓國／日本進出口（`XTEXVA01KRM667S` 等）每次都輪不到，總經頁「韓國進出口」一直顯示「資料還沒收集到」。現在 `fred_fetch_order` 先抓從未存過的序列，再依上次抓取時間由舊到新，預算不夠時略過的是最新鮮的序列。PostgreSQL 已有資料的序列（`FRED_PERSISTED`）不會插到沒資料的序列前面。
- HTML 日曆時刻核對每日最多一次／release，只對 keyed API 已取得的日期作補充；日期不一致標示衝突，時刻缺失保持date-only／expected。BLS受限日程不列入排程。
- 本站 API 共用快取 5 分鐘，資料更新後失效；瀏覽器載入時讀一次、可見狀態每 5 分鐘更新，背景分頁停止輪詢；倒數在本機運算。
- 403 停止快速重試並記錄受限；429 尊重 Retry-After；5xx／timeout 指數退避含 jitter、最多 3 次，均計入請求預算。
- 抓取失敗仍可從 DB 讀取舊值；freshness 看最近成功擷取，資料月份另呈現，不把月頻資料自然較舊當成服務失效。

## 6. 本站 API 契約

新增 backend `GET /market/dashboard/macro`，由 Astro 代理為 `GET /tymultiverse/api/market/dashboard/macro`。公開唯讀，回應不含任何帳戶資料。

參數：`from`／`to` 為 ISO 日期，`historyMonths` 預設 24、上限 60；日期視窗上限 366 天。預設視窗為台北今日往前 7 天到未來 30 天。

回應包括：

```json
{
  "asOf": "<UTC ISO timestamp>",
  "displayTimezone": "Asia/Taipei",
  "indicators": [],
  "events": [],
  "sources": [],
  "nextRefreshAt": "<UTC ISO timestamp>"
}
```

`indicators` 包含 code、referencePeriod、value、unit、previousValue、previousRevision、change、changeUnit、preliminary、sourcePublishedAt、fetchedAt、history。

`events` 包含 id、groupId、type、referencePeriod、scheduledAt、timePrecision、scheduleVerification、publishedAt、status、highlightLevel、indicatorCodes、sourceUrl。只有日期時 scheduledAt 不捏造午夜作精確時間，另回 scheduledDate。

`sources` 分別回 source、availability、lastSuccessAt、stale、errorCode；部分來源失敗時回可用資料與狀態。DB 完全沒有可用資料才回明確 no_data。不得在 GET 路由同步抓取全套上游。

前端沿用 `import.meta.env.BASE_URL`／既有 API path helper，避免打到網站根路徑 `/api`。新增文字進 i18n.json，CSS 依 BaseLayout manifest 規則載入。

## 7. 與公司事件系統的整合

抽取共用 EventStatus／HighlightLevel／日期顯示規則；公司事件及總經事件保留各自資料來源與業務模型。總經提醒出現在總經表與市場總覽提示，不把全部持股列染成「公司有公告」。

AI 研究可透過公開 macro API 讀到近期事件與資料截點，供評論引用；這次不自動改寫既有 AI 評論，也不依 CPI 單一數值自動產生買賣結論。公司基本面／籌碼與宏觀背景的關係由研究評論說明。

## 8. 開發順序與完成標準

1. 先完成 FRED_API_KEY 的取得與 Jenkins 保存，在正式後端驗證 keyed release/dates 的兩個release、未來日期、分頁及授權額度，再開發adapter。BLS registered API、Fed日期／RSS已驗通；FRED HTML研究結果不計為 keyed API驗收。BLS受限日程不再作必需依賴。
2. Migration、資料模型、來源 adapter、計算及修訂歷史；初始官方日程與歷史資料匯入。
3. 排程、分散鎖、每日預算、退避、來源健康與 DB 快取。
4. 本站 API、SSR／前端總經區、倒數及共用事件樣式；放在持股摘要上方。
5. 驗證時間／數值／版本，完成建置，依專案既有 pipeline 發佈不可變 image，正式 UI 驗收。

必要驗收：

- 非農新增單位、失業率 pp、CPI 季調月增／未季調年增及利率 bp 與官方定義一致。
- 美國夏令時間切換、台灣隔日、只有日期、改期及取消不誤提醒。
- 24／72 小時與 7 天邊界、剛公布 24 小時邊界可重現，顏色與狀態文字一致。
- 到時未更新、數值不變、有效零值、修訂前值、初次歷史匯入、FOMC 利率不變均正確處理。
- BLS API 回 HTTP 200 但應用層失敗不寫入；M13、缺月份、缺年增基期不生成假數值。
- 來源 403／429／5xx／timeout 時舊資料仍可讀，明示狀態；DB 重啟後資料存在、版本保留。
- 多訪客、多副本與重複初始化不倍增上游請求；排程請求預算可查。
- 正式站 API、前端 bundle 版本、image／rollout 與實際畫面一致；桌機與320/390px能看清日期／單位且無整頁橫向溢出。
- 「全自動日程更新」必須有正式環境成功擷取與改期更新證據；僅能瀏覽官網或人工匯入不能宣告達成。FOMC日期自動更新與精確時刻是否confirmed分開驗收。

## 9. 官方參考

- 使用者提供的背景文章：https://havocfuture.tw/blog/python-economy-fred
- BLS API：https://www.bls.gov/developers/api_signature_v2.htm
- BLS 額度：https://www.bls.gov/developers/api_faqs.htm
- BLS 非農日程：https://www.bls.gov/schedule/news_release/empsit.htm
- BLS CPI 日程：https://www.bls.gov/schedule/news_release/cpi.htm
- BLS 全月日程與 Eastern Time 說明：https://www.bls.gov/schedule/2026/10_sched.htm
- Fed 會議日程：https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm
- Fed RSS：https://www.federalreserve.gov/feeds/press_monetary.xml
- Fed 已驗實施公告：https://www.federalreserve.gov/newsevents/pressreleases/monetary20260916a1.htm
- Fed 常規公布時間說明：https://www.federalreserve.gov/newsevents/pressreleases/monetary20130313a.htm
- FRED API key：https://fred.stlouisfed.org/docs/api/api_key.html
- FRED 公布日期：https://fred.stlouisfed.org/docs/api/fred/release_dates.html
- FRED 免費公開日曆（明示US Central Time）：https://fred.stlouisfed.org/releases/calendar
- Fed 月曆：https://www.federalreserve.gov/newsevents/calendar.htm

計畫狀態：v3完整實作規格已定案，尚未實作；正式FRED API必須帶key。尚待：FRED key取得、Jenkins保存及正式後端keyed API驗證。Fed精確時刻仍依證據標示confirmed／expected。規劃文件完成與所有來源已驗收是不同狀態。

## 10. 2026-10-15 BLS 註冊與憑證保存紀錄

- 使用者已完成 BLS 註冊並提供 API key。帶 registrationkey 的官方 POST 請求實測為 `REQUEST_SUCCEEDED`，成功取得 `CES0000000001`，無應用層錯誤訊息。這僅驗證數值 API，未解除日程 403。
- 本機備份以 Windows DPAPI CurrentUser 加密，保存於 `%LOCALAPPDATA%\TY-Multiverse\secrets\bls-api-key.dpapi`，已確認可解密使用；僅相同 Windows 使用者可還原。此備份在 repository 之外。
- Jenkins 使用 Secret text，credential ID／後端環境變數均為 `BLS_API_KEY`，範圍為 `vinskao` 資料夾，使既有 Maya job 可使用。
- Jenkins 已保存：`vinskao` 資料夾的 Secret text，ID 為 `BLS_API_KEY`；本次已將其加入 Maya 部署階段的 `withCredentials` 與 runtime Kubernetes Secret，再透過 `secretKeyRef` 供後端讀取。不加入 build argument、前端 `PUBLIC_*`、Docker image 或公開 API。
- 文件只記 credential ID、保存位置與驗證結果，不記 key 值及驗證信連結；驗證請求不輸出 registrationkey。此為本機部署設定改動，尚未跑正式 pipeline。

## 11. 正式來源與憑證契約（v3最終決議）

| Credential／設定 | 狀態 | 正式用途 |
| --- | --- | --- |
| Jenkins Secret text `BLS_API_KEY`，folder=`vinskao` | 已保存，正式Pod批次來源探測成功 | BLS數值；註冊額度500次／日，本站預算40次／日 |
| Jenkins Secret text `FRED_API_KEY`，同一folder | 尚未建立，需取得FRED獨立key | FRED JSON API；所有正式API請求帶key |
| Kubernetes Secret `macro-data-credentials` | Jenkins pipeline程式已設定保存BLS欄位；尚未部署驗證 | 另待FRED key加入後注入第二欄位 |
| `MACRO_ENABLED` | 規劃，預設false | 兩個必要key與DB初始化驗收成功後才啟用總經排程 |
| `MACRO_BLS_DAILY_BUDGET=40`／`MACRO_FRED_DAILY_BUDGET=100` | 規劃 | 本站額度，失敗重試及手動刷新均計入，多副本共用 |

FRED請求規格：`GET https://api.stlouisfed.org/fred/release/dates`，query含`release_id=50|10`、`file_type=json`、`include_release_dates_with_no_data=true`、`sort_order=desc`、`limit`、`offset`及由後端secret讀取的`api_key`。日期由帶key API提供；公開日曆只補上經查證的US Central公布時刻，失敗時保留date-only精度。另以帶key `series/observations`擷取`DFEDTARL`與`DFEDTARU`目標區間上下限序列。正式啟用前以FRED release metadata確認ID與名稱，驗證未來日期與查證日曆一致。

額度與權限必須分別驗證：key有效、API回200且schema正確、供應商限制與本站預算均符合；HTML回200不能證明key權限或API額度。來源錯誤保留DB舊資料與錯誤狀態，缺key不得觸發匿名fallback。

Jenkins只在部署secret階段使用`withCredentials`；不要把key寫進既有image內的env.properties。建立／更新Kubernetes Secret後，確認運行中process有對應變數（僅輸出present/absent），不輸出值。應用與HTTP client日誌移除FRED的`api_key` query、BLS的`registrationkey` body；不得把帶key的完整URL寫到錯誤訊息、trace、fetch_runs、瀏覽器或公開API。文件與證據只記ID與驗證狀態。

## 12. 實作檔案、交付批次與回滾

下表列出已開始的程式改動。

| 區域 | 預定檔案 | 工作 |
| --- | --- | --- |
| 後端來源／服務 | `maya-sawa/maya_sawa/services/market_macro.py`及必要source adapters | BLS／FRED keyed請求、Fed事件、精度／來源合併 |
| DB | `maya-sawa/maya_sawa/databases/market_macro_db.py`、`sql/create_market_macro_tables.sql` | 六組資料表、索引、修訂、分散鎖與請求計數 |
| API與生命週期 | 既有`maya_sawa/api/market.py`、應用startup/shutdown位置 | 唯讀macro endpoint、單一排程生命週期及清理 |
| 前端 | 新增`src/pages/api/market/dashboard/macro.ts`及`src/styles/market-macro.css`；既有`src/pages/index.astro`、`src/scripts/index.ts`、`src/layouts/BaseLayout.astro`、`src/storages/i18n.json` | 代理、持股摘要上方區塊、指標卡／公布提醒／手機及語系 |
| 部署 | Maya `Jenkinsfile`、`k8s/deployment.yaml`及環境範例 | 兩組Secret text綁定、runtime secretKeyRef、feature flag |

交付分為：A來源／憑證驗收；B migration與初始化；C排程／API；D UI／共用提醒；E正式部署驗收。每批保留完成證據，不能以A成功替代整體完成。

資料庫使用既有市場DB連線模式，migration需可重跑且不修改既有公司事件／AI評論資料。資料量小，原始月資料與修訂長期保存；fetch_runs預設保留90天，過期只清理診斷紀錄。API historyMonths上限60需預載至少72個月原始CPI，按需要單次回補並計入額度，不在訪客GET即時回補。

關閉`MACRO_ENABLED`可停止上游排程，既有DB及唯讀結果仍保留；前端feature flag可隱藏總經區。回滾使用上一版不可變image，不刪除新表、日程或憑證。部署僅觸及Maya與前端，不因這項功能重啟IBKR Gateway。

最終驗收追加：正式Pod內兩個key皆present；FRED請求成功並計入registered來源計數；log掃描沒有secret值；未配置key時明確blocked且上游匿名呼叫為零；日程日期與時刻各有provenance；生產來源schema變動不清空事件；公司事件與持倉高亮仍可正常操作。

## 13. 2026-10-15 實作進度

已完成本機程式碼初版：

- Maya 新增總經資料庫模型、可重複建表、觀測值修訂及公布事件版本表、來源執行紀錄，以及來源請求的 PostgreSQL advisory lock 預算預留。
- 新增 BLS 六序列低頻擷取、FRED 帶 key 的 release dates 與目標利率上下限月末序列、FRED 公開日曆僅作時刻補充、Fed 年度會議日曆來源。上游請求錯誤不寫入資料值；GET API 只讀 DB 並用五分鐘記憶體快取。
- 新增 `GET /market/dashboard/macro` 及 Astro 同源代理；首頁市場摘要上方新增總經公布卡片、非農／失業率／CPI／核心 CPI／Fed 目標區間與英中介面文字。
- 新增免費 Finance Calendar 共識日曆低頻同步，將有來源的共識與實際值持久化到事件紀錄，保存修訂並提供「高於／符合／低於預期」標籤；來源缺值不填造，且畫面列出授權要求的來源連結。該 API 本機已回應成功，但非農／CPI共識覆蓋率仍需持續監看。
- Jenkins 已加入 deploy-time `ENABLE_MACRO_COLLECTION` 參數及條件式 `Configure Macro Collection` stage；預設 false。啟用時才把 BLS/FRED key 綁到 runtime Kubernetes Secret；Maya Pod 的 key refs 為 optional，且收集功能旗標保持關閉，避免缺 key 時啟動抓取。
- 新增明確 SQL migration 檔案 `maya-sawa/sql/create_market_macro_tables.sql`。Maya 使用既有 SQLAlchemy metadata 初始化方式，資料表採 additive create，不刪除舊資料。

本節為 2026-10-15 的歷史狀態。FRED credential 和正式 Pod keyed API 驗證已於第 15 節完成；正式 DB schema、資料寫入、排程及頁面仍待部署驗收。聯準會公布時刻和利率觀測列仍須以實際同步結果驗證；程式會保留日期精度／來源狀態，不偽造精確時間。

## 14. 候選總體經濟來源核對（2026-10-15）

| 來源 | 可用內容 | 自動化與授權判斷 | 本計畫用途 |
| --- | --- | --- | --- |
| [MarketWatch Economic Calendar](https://www.marketwatch.com/economy-politics/calendar) | 經濟事件、Actual、Forecast、Previous，適合人工交叉核對 | 找不到官方公開 API 或可依循的自動擷取規格；不以爬頁方式作正式資料管線 | 提供來源連結／人工參考，不作 DB 資料源 |
| [Investing.com Economic Calendar](https://www.investing.com/economic-calendar) | Actual、Forecast、Previous、事件重要度 | [官方支援頁表示沒有公開 API](https://www.investing-support.com/hc/en-us/articles/115005473825-Do-You-Offer-API-Access-at-Investing-com)；其日曆 widget 依其條款使用，不能當成可持久化的免費 API | 人工交叉核對；不抓取或保存其頁面資料 |
| [CME Market Data APIs](https://www.cmegroup.com/market-data/market-data-api.html) | 可申請 API；FedWatch 提供期貨隱含的聯邦基金利率機率 | 官方說明需訂閱／市場資料授權；FedWatch 是市場定價機率，不是 CPI、非農的調查共識 | 目前不納入免費版；未來若購買授權，作為利率預期的獨立訊號 |
| [Atlanta Fed GDPNow](https://www.atlantafed.org/research-and-data/data/gdpnow) | 季度實質 GDP 即時估計與可下載資料 | 公開研究資料；GDPNow 是模型 nowcast，並非 Fed 官方預測或市場調查共識（[官方說明](https://www.atlantafed.org/research-and-data/data/gdpnow/explainer)） | 適合後續增加「GDPNow 模型估計」指標；不可標成高於／低於市場預期 |
| [DGBAS 總體統計資料庫 API](https://nstatdb.dgbas.gov.tw/dgbasAll/download/API%E8%AA%AA%E6%98%8E%E6%96%87%E4%BB%B6.pdf) | 台灣 GDP、CPI、勞動與其他官方統計的歷史／實際值 | 官方 API 文件載明匿名查詢，不需身份驗證；按統計表代碼、維度和期間查詢，支援 JSON。此次實際試呼叫範例 URL 回傳 HTML 頁面而非 API-JSON，因此 endpoint 路由仍須完成驗證，不能記為已接通 | 作為台灣總體資料第二階段來源；先驗證 API-JSON 的正確呼叫形式、指標維度、更新與修訂規則 |
| [Finance Calendar API](https://www.financecalendar.com/api/)（現有整合） | 事件日期、Actual／Consensus／Previous 欄位 | 免費公開介面；目前已整合低頻同步及 DB 快取。已查到未來事件中部分 Consensus 為空 | 現階段唯一自動取得預期值的免費來源；預期欄位須保留缺值和來源，不能把 Previous 當 Consensus |

### 結論與資料標示規則

以上五個新來源**不足以單獨構成可正式自動抓取、可持久化且涵蓋「高於／符合／低於預期」的資料管線**：MarketWatch 與 Investing.com 可供人工比對但沒有適用的公開 API；CME 需授權且量測的是市場隱含利率機率；GDPNow 是模型估計；DGBAS 是官方實際統計，沒有市場共識值。現階段保留 Finance Calendar 作免費共識欄位來源，並以 BLS／FRED 的官方公布值和日期作美國資料來源。若共識為空，UI 顯示「尚無共識資料」，不生成高於／低於預期標籤。台灣 DGBAS、GDPNow 作為分開的實際值／模型序列，後續擴充。

### Jenkins 與正式啟用狀態

此處為 2026-10-15 建立 FRED credential 前的歷史紀錄，最新狀態以第 15 節為準。pipeline 的 `ENABLE_MACRO_COLLECTION` 參數預設為 `false`；只有在來源 key 與正式 DB schema 檢查完成後，部署參數設 `true` 才會載入兩筆 key 並啟動收集。

## 15. FRED credential 與正式來源驗證（2026-10-15，取代先前缺 key 狀態）

使用者取得 FRED 獨立 key 後，已保存到 Jenkins `vinskao` folder 的 Secret text，ID `FRED_API_KEY`，描述 `St. Louis Fed FRED API key`。Chrome 已確認 credential detail 頁存在；key 值未寫入 repository 或文件。BLS 與 FRED 憑證現在都已備妥。

由正式 `deployment/maya-sawa` Pod 執行四次帶 key 的只讀來源請求，全部 HTTP 200，且 schema 與資料符合預期：

| Endpoint | 參數 | 結果 |
| --- | --- | --- |
| FRED `release/dates` | `release_id=50`、`include_release_dates_with_no_data=true` | 回傳未來非農日程 2026-11-06、2026-12-04 |
| FRED `release/dates` | `release_id=10`、`include_release_dates_with_no_data=true` | 回傳未來 CPI 日程 2026-11-10、2026-12-10 |
| FRED `series/observations` | `series_id=DFEDTARL`、2026-10-01 起 | 15 筆日資料；樣本值 3.75% |
| FRED `series/observations` | `series_id=DFEDTARU`、2026-10-01 起 | 15 筆日資料；樣本值 4.00% |

這次為正式網路環境中的來源連線驗證；key 僅存在探測行程記憶體，未安裝到目前運行的 Pod 環境，未宣稱排程或 DB 持久化已驗收。下一次以 `ENABLE_MACRO_COLLECTION=true` 執行修改後 pipeline 時，`Configure Macro Collection` stage 會從兩筆 Jenkins credentials 建立／更新 `macro-data-credentials`，deployment 透過 `secretKeyRef` 注入 runtime 環境。仍須完成正式 DB 初始化、資料寫入、排程／快取和 UI 部署驗收。

保存證據位於 workspace 的 `.local-evidence/fred-jenkins-credential.png`，只含 credential 描述，沒有 key 值。

## 16. 正式部署實測與待完成項（2026-10-15）

- 前端 build #276 已成功部署，總經卡片位於市場總覽頂端、持股摘要上方。
- Maya build #104 因 agent 容器重複執行 `poetry install`、無法解析 `shioaji==1.5.3` 而失敗；該階段不產生正式映像，已在 `d26bfc0` 移除。映像建置仍由 Dockerfile 執行鎖定依賴安裝。Maya build #105 成功部署 schema；build #106 帶 `ENABLE_MACRO_COLLECTION=true` 成功部署並建立 `macro-data-credentials` Secret。
- 正式 DB 已確認 6 張 `maya_sawa_macro_*` 表存在。首輪 BLS 同步成功：六序列各 81 筆、共 486 筆，期間 2020-01 至 2026-09；資料已寫入 DB，API GET 只讀持久化資料。
- Finance Calendar 首輪成功寫入 6 筆未來事件（FOMC、非農、CPI）；Federal Reserve HTML parser 本輪成功 HTTP 200 但解析 0 筆。Finance Calendar 目前六筆 consensus/actual 均為空，所以不能產生高於／符合／低於預期標籤；前端將明確顯示「尚無共識資料」，不推算也不以 previous 代替 consensus。待來源回傳 consensus 與 actual 後才分類。
- FRED runtime 首輪因 `TimeoutError` 失敗，尚未寫入目標利率序列或 FRED release dates。從 Maya pod 所在節點 `10.0.159.167` 直接呼叫 FRED hosts 逾時，但在節點 `10.0.158.183` 的 Jenkins pod 中可以連線；已更新 `k8s/deployment.yaml` 將 Maya 排程固定至可用節點，並準備重新部署後重試。FRED credentials 在 Kubernetes Secret 中已存在；不能在 FRED API 成功前宣稱利率／release data 完成。
- 建置期間曾出現 Maya 与 cert-manager readiness/liveness timeout。完成前端 #276 與 Maya #106 後未觀察到新的 timeout；目前 app pods 為 Ready。`cert-manager-webhook` 曾累積 26 次重啟且上一個 container exit code 137，探針 timeout 事件橫跨既有叢集生命週期；這是既有叢集健康項目，與 macro tables 無關，仍需維運者另行觀察。Metrics API 未啟用，因此本次無法用 `kubectl top` 取得即時 CPU／記憶體數據。
- Jenkins pipeline 的 `ENABLE_MACRO_COLLECTION` 預設已改為 true（兩組憑證與 schema 已驗證）；`DEPLOY_IBKR_GATEWAY=false` 時會略過 IBKR image build stage，避免不相關映像推送。

### 收尾驗收條件

1. 排程固定節點後，確認 FRED `release/dates`、`series/observations` 均成功，且 `maya_sawa_macro_observations` 有 `DFEDTARL`、`DFEDTARU` 歷史列；API indicators 顯示利率上下界，FRED release dates 留在 DB。
2. 重新讀取正式頁面確認 macro indicators、FOMC／非農／CPI 日期與台北時區時間皆可見，及 API 讀取不觸發上游同步。
3. 觀察 Finance Calendar consensus 欄位後續是否提供值；若仍空，保留明確「尚無共識資料」狀態，不標示 beat/miss。

## 17. 最新正式環境驗收（2026-10-15）

- Maya build #108 已部署 `papakao/maya-sawa:108`，pod 在 `10.0.158.183` 為 Ready，rollout 成功。修正 build #107 暴露的 ARM64 wheel 相容性，將 Shioaji 升至可安裝的 1.5.8。
- 前端 build #277 已部署 `papakao/ty-multiverse-frontend:277`，Deployment 為 1/1 Ready；正式 `/tymultiverse` 回 HTTP 200，頁面含總經事件與指標面板。
- 正式 macro API 回 HTTP 200，回傳 6 個 BLS 指標與 6 個近期事件。直接查詢 PostgreSQL 確認 `maya_sawa_macro_observations` 486 列、`maya_sawa_macro_events` 6 列、`maya_sawa_macro_fetch_runs` 17 列及 `maya_sawa_macro_event_revisions` 6 列；GET 取用既有 DB snapshot，不以頁面請求現場抓取。
- 最近同步時 FinanceCalendar、FederalReserve 日曆與 BLS 回報 success；事件日期／時間已供總經面板顯示。尚無共識值的事件繼續顯示「尚無共識資料」，不產生超預期／低於預期標籤。
- **FRED 尚未驗收成功**：正式 API source health 為 `TimeoutError`，資料庫目前沒有 FRED 利率觀察值；FRED release dates 亦未確認寫入。已在 Maya pod 內確認 FRED 網域 DNS、TCP 443 與 TLS 握手可通，但 keyed API 請求仍逾時。不可將 FRED 利率與 FRED release dates 標示完成，需再查上游回應／執行環境出口並於 API 成功後重驗 DB。
- `ssh oke-node` 檢查時，除已完成的 CronJob pod（Succeeded）外，沒有 Pending pod；Maya、前端及其餘服務 pod 均為 Running/Ready。`cert-manager-webhook` 目前 Ready，但既有 26 次重啟仍需持續觀察。Metrics API 不可用，無法讀取 `kubectl top` 即時資源數據。

### 剩餘驗收條件

1. 查明正式環境 FRED keyed API 請求逾時的原因，取得 FRED release dates 與 `DFEDTARL`／`DFEDTARU` 歷史值，確認寫入 PostgreSQL 且 API 回傳利率指標。
2. 瀏覽器已確認面板顯示 6 個總經指標與 6 筆事件、台北時區日期及時間；FRED 逾時時頁面清楚顯示來源資料部分過期。近期事件距公布日超過 7 天，因此本次沒有事件進入 highlight 期限，需在進入 7 天內再次驗證提醒樣式。
3. 觀察共識來源後續能否提供 consensus 與 actual；取得兩者後才顯示超預期、符合預期或低於預期。


## 18. 最新可用期、零售銷售與公債殖利率（2026-10-15）

依正式 API 檢視，BLS 指標已保存到 2026-09 與 2026-08 兩期；零售銷售及美國公債殖利率則尚未接入。新增規格如下：

- FRED series `RSAFS`：Census Advance Monthly Sales for Retail and Food Services，月頻、季調、百萬美元；FRED release `9` 提供零售銷售公布日。來源說明：[FRED RSAFS](https://fred.stlouisfed.org/series/RSAFS)、[Census 2026 發布日曆](https://www.census.gov/retail/release_schedule.html)。
- FRED series `DGS10`：美國 10 年期公債 constant maturity 市場殖利率，日頻、百分比；這是市場殖利率，不等同 Fed funds target。來源：[FRED DGS10](https://fred.stlouisfed.org/series/DGS10)，原始來源為 Federal Reserve Board H.15。
- 每張指標卡顯示統計期；有保存前一期時顯示前期數值與期間。CPI 成長率找不到精確比較期時，使用已保存前一筆計算月變化；年比較期缺失時明確顯示最新指數值，不留空白或捏造成長率。
- 公布日進入七天內時使用高對比琥珀色底、外框及柔和呼吸提示；尊重作業系統的減少動態效果設定。
- FRED 每次同步預計最多 3 個 release dates 加 4 個 series observations 請求；四次／日約 28 次，低於配置的 FRED 每日 100 次上限。

**正式資料仍未完成驗收**：目前 production snapshot 的 FRED source 仍回 `TimeoutError`，資料庫尚無 `RSAFS`、`DGS10` 或 FRED retail release dates。程式接好後，必須先恢復 FRED Pod 出口，再確認最新一期與前一期都進 DB、API 回傳兩序列，並於本週公布資料進入七天窗口時驗證高亮。頁面 GET 繼續只讀 DB，不觸發現場抓取。

## 19. 指標趨勢圖呈現（2026-10-16）

- 每個總經指標卡都應顯示以已持久化歷史資料繪製的折線趨勢圖，附日期 X 軸與含單位的 Y 軸；訪客頁面仍只讀 dashboard API，不向來源即時補抓。
- CPI 與核心 CPI 年增卡的趨勢以精確對齊 12 個月前的指數計算 YoY；月增卡與零售銷售趨勢以精確前月計算 MoM。若比較月份不存在，保留缺口，不可拿相鄰資料列冒充比較期。
- 非農趨勢顯示每月新增人數（就業水位的月差）；失業率、Fed 目標利率上下限與 DGS10 顯示各期百分比水位。所有圖表保留日期標籤、百分比／人數刻度及點位 hover 資訊。
- FRED DGS10 位於利率群組，直接使用 API 回傳並已寫入 DB 的歷史序列；零售與其他指標遵循相同圖表模式。

## 20. 台灣央行、貿易、匯率與商品序列（2026-10-16）

- 免費、低頻的央行利率／匯率、關務署月進出口、TPEx 黃金及 DGBAS 就業／失業序列放在 Python 行程內的有界 TTL 快取，不寫入 `maya_sawa_macro_observations`。快取有效 12 小時，過期後保留最多 30 日供上游故障時回退，卡片須標示快取過期；API snapshot 自身另快取 5 分鐘。
- 2026-10-20 修正：重啟後總經卡片大量空白。快取只在行程記憶體，每次部署重啟都要重抓所有免費來源，而各來源的每日次數上限跨重啟計算；當天部署幾次後額度用完，新 pod 抓不回資料，API 只剩 14 個指標（其餘約 45 張卡空白），要到額度滾動才恢復。現在每個快取序列另存一列到 `maya_sawa_macro_cached_series`（每個代碼一列、覆寫，不是觀測值列）。pod 啟動時讀回記憶體並保留原本的 `fetchedAt`，所以仍新鮮的序列不會重抓、不耗額度，過期判斷照舊。超過 30 天的不讀回。測試：`maya-sawa/tests/test_market_macro_cache_restart.py`。
- 央行利率來自 `EG28D01`；匯率來自 `FTDOpenData_Day`，近六年資料留在行程記憶體。關務署 6053 CSV 以精確去年同月計算出口／進口年增率。TPEx 黃金現貨以台幣／台兩顯示；World Bank Pink Sheet 補入黃金月均價（美元／金衡盎司），FRED WTI 沿用已持久化序列，避免破壞既有趨勢歷史。
- DGBAS `A040101020` 以匿名 API 抓合計就業者與失業者月資料；其他 DGBAS dataset 需使用相應維度與統計週期查詢，並成功解析 observations 後才加入面板。
- PostgreSQL 僅保留 BLS／FRED 需跨重啟使用的歷史觀察、事件及來源同步紀錄；新免費快取觀察不增加持久化資料列。多副本部署時 Python 本機快取不共享，各副本需各自啟動來源同步。
- 日頻持久化序列 API 快照保留約 24 個月；FRED 日頻拉取窗口同步擴至 730 日。免費行程快取不保證 pod 重啟後仍有歷史趨勢，重新啟動後會由下一輪來源抓取重建。

### 已驗證來源與尚缺資料

| 指標 | 來源／頻率 | 目前限制 |
|---|---|---|
| 台灣央行三項政策利率 | [央行統計 API](https://cpx.cbc.gov.tw/Data/ExportToAPIInfo)，`EG28D01`，歷史日點／政策調整日 | 免費；尚待正式環境同步與 DB 驗收 |
| 美元／新台幣銀行間收盤匯率 | [央行開放資料](https://data.gov.tw/dataset/7232)，日頻 | 免費；保存近六年 |
| 台灣進出口 | [關務署資料集 6053](https://data.gov.tw/dataset/6053)，月頻 | 免費；總值單位為新台幣千元，年增率需有去年同月才可計算 |
| 台灣黃金現貨 | [TPEx 開放資料](https://data.gov.tw/dataset/32443)，日頻 | 台幣／台兩；TPEx 最新值由 Python 本機快取保存。台銀免費歷史 CSV 在目前執行環境遇到反爬驗證，尚不可穩定自動回補；牌價口徑也不同。 |
| 國際黃金月均價 | [World Bank Pink Sheet](https://www.worldbank.org/en/research/commodity-markets)，月頻 | 已驗證官方 XLSX 可免費下載及解析；美元／金衡盎司，僅行程快取 45 日。這是月均價，不是即時現貨。 |
| WTI 原油 | [FRED／EIA DCOILWTICO](https://fred.stlouisfed.org/series/DCOILWTICO)，日頻 | FRED API key 為正式環境必要憑證；既有 FRED 網路逾時需先恢復並確認資料持久化 |
| CoreWeave（CRWV）單一發行人 CDS／信用利差 | ICE 公開每日結算頁為候選：[ICE single-name CDS](https://status.ice.com/cds-settlement-prices/icc/single-name-instruments) | **尚未找到可確認涵蓋 CRWV、可自動擷取且允許網站快取／再展示的免費來源。** ICE 歷史／資料庫存取須授權。不可用市場整體 OAS 冒充 CoreWeave 個別 CDS。 |
| 主計總處其他總體序列 | [DGBAS 統計資料庫 API 規格](https://nstatdb.dgbas.gov.tw/dgbasall/download/API%E8%AA%AA%E6%98%8E%E6%96%87%E4%BB%B6.pdf) | 免費匿名 API；查詢每個資料集必須帶維度篩選、頻率及起訖期。以下使用修正後代碼，並需在接入時按各資料集的維度結構選取合計序列。 |

### 主計總處代碼核對（官方 API 附表）

使用者提供的清單有數個代碼與名稱不符，接入時以官方附表為準：

| 用途 | 正確資料集／代碼 | 備註 |
|---|---|---|
| 季 GDP（支出面，70 年以後） | 國內生產毛額依支出分－季 **A018102060** | A018102010 是 40–69 年歷史表；A018102020 是「國內生產及要素所得」。 |
| CPI 分類與項目群 | 消費者物價基本分類暨項目群指數 **A030101025** | A030101015 是消費者物價基本分類指數。 |
| 經季調綜合物價指標 | 各種物價總指數（含經季節調整）**A030601015** | A030502015 是營造工程物價指數（含查價項目）。 |
| 家庭收支總覽 | 家庭收支重要指標 **A020001010** | 使用者列的 A018706010 是政府消費。 |
| 五等分位所得／消費／儲蓄 | **A020003010** | A020002010 為所得總額按來源別。 |
| 勞動力按教育程度 | **A040101020** | 代碼正確；但分類表較細，儀表板應只選總計系列，避免把多個教育分類誤當同一總體指標。 |

已對 A040101020 的合計就業者維度查詢實際發出匿名 API 請求並收到 21 個月觀察值。程式接入合計就業者與失業者兩條序列，放入行程快取。其他資料集的 metadata 可讀，但其觀察值查詢尚未完成維度／週期驗證，不能標成已接入。

### 免費來源邊界

- Yahoo Finance 的 GC=F 是黃金期貨連續合約，不是現貨；Yahoo 官方說明將下載歷史資料列為 Gold 訂閱功能。現階段不把非官方 Yahoo API 當正式免費來源。
- FRED 提供的 LBMA／ICE 黃金定價序列已因資料授權自 FRED 移除，不能以原 series ID 當成仍可用的免費歷史 API。[FRED 移除公告](https://fred.stlouisfed.org/news/2022/01/ice-benchmark-administration-ltd-iba-data-to-be-removed-from-fred)
- CoreWeave 債券殖利率可作為 CDS 的**替代信用風險指標**，但不得標成 CDS。免費 FINRA Query API 公開資料集主要是交易聚合；FINRA 說明 TRACE API 不屬於該 Query API。若要用單一債券逐筆成交／殖利率，須先確認可免費查詢、可程式存取及網站展示條款；付費資料一律排除。[FINRA API 文件](https://developer.finra.org/docs)、[FINRA Fixed Income API 範圍](https://developer.finra.org/node/1171)

前端應展示最新統計期、來源名稱與抓取時間；行程快取超過來源 freshness 時限便標示過期並保留最近值。免費序列已接入本機快取與 API snapshot，但尚未部署及 production 驗收；pod 重啟會清除快取，直到下一輪排程重新載入。付費資料源不接入。

## 21. CPI 實際值與市場預期同圖（2026-10-16）

- 美國 CPI 年增率趨勢圖需同時繪出官方實際值（BLS CPI 指數計算 YoY）和經濟日曆的市場共識預期；實際值為藍色實線，預期為琥珀色虛線，hover 同時讀取該期實際／預期值。
- Finance Calendar 免費 API 的日期區間最長 92 日，文件說明 consensus 約在公布前兩日出現、actual 於公布後一小時內補入，並要求網站顯示來源連結。本服務每輪以兩次請求讀取過去 90 日及未來 90 日，Finance Calendar 預算上限調為每日 8 次（每 6 小時排程兩次請求），事件預期／實際欄位持久化於既有 macro event 表，以保留短暫出現的共識值；不持久化額外觀察序列。
- 趨勢圖只把明確標示 YoY 的 CPI consensus 畫在 CPI 年增率序列上，避免把 MoM 共識錯當年增率。來源沒有提供預期值時，圖上明確說明預期尚未發布，不以 previous 或模型估算補值。
- Finance Calendar 回應驗證顯示最近歷史 CPI event 有部分 actual 字串，但 consensus 為空；未來 CPI event 亦可能尚未提供 consensus。來源文件說共識約在發布前兩日提供，因此在實際填值前圖上只有實際線並顯示等待說明。未宣稱已可回填完整歷史市場預期序列。

### 21.1 已加入免費前瞻預期序列

- 為讓圖上在沒有短期公布共識值時也能比較「實際通膨與預期通膨」，新增密西根大學 Surveys of Consumers「Expected Changes in Inflation Rates / Next Year」月序列（`UMICH_CPI_EXPECTED_1Y`）。官方 CSV 現有近 13 個月值，程式從直接官方 CSV 讀取第四欄的一年期中位數，12 小時本機 TTL 快取，不寫觀察值到 PostgreSQL。
- CPI 年增實際值維持 BLS `CUUR0000SA0`；同圖的藍色實線是實際年增率、琥珀虛線是一年期消費者預期、紫色點線則只在日曆提供明確 YoY 共識時才顯示。Hover／鍵盤 readout 逐期列出同一期間實際、消費者預期與公布共識，明確區分調查預期與專業市場共識。
- 資料來源可見連結：[密西根大學 CPI 預期表與 CSV](https://www.sca.isr.umich.edu/tables.html)、[Finance Calendar 共識 API](https://www.financecalendar.com/api/)。

### 21.2 初領失業救濟、PPI、PMI 與比較圖

- 美國初領失業救濟金人數使用 FRED `ICSA`（美國勞工部 ETA 來源、季節調整、週資料，週六結束）。透過既有 FRED API key 抓取最近兩年並存入既有觀察值表；快照取用的週資料點數上限為所選月份數的五倍。資料庫實際只增加每週一筆左右。FRED 發布日曆 release `180` 也接入就業事件，日期以單週為單位，不會被同月其他週覆寫。
- 美國 PPI 使用 BLS `WPUFD4` Final Demand 未季調指數，年度變化以同月去年值計算；台灣 PPI 使用主計總處總體統計資料庫 `A030701015` 生產者物價基本分類指數中的總指數，年度變化同樣由指數計算。兩條 PPI 年增率放在同一張比較圖。台灣 PPI API 結果留在 Python process-local TTL cache，不寫入 PostgreSQL。
- 台灣製造業 PMI 與非製造業 NMI 從中華經濟研究院官方趨勢頁的月資料表讀取，保留來源頁當下提供的歷史列，12 小時本機 TTL 快取，不寫入 PostgreSQL；各自以指數點趨勢圖呈現。
- CPI 比較圖把整體與核心 CPI 的月增、年增放在同一圖，並保留密西根大學一年期消費者通膨預期與可取得時的公布共識。零售銷售圖將月增與年增放在同一圖，均由同一原始月序列計算，不把美元金額當成增幅。
- 美國 ISM PMI 官方報告可免費閱讀，但 ISM 網站條款限制未取得書面授權前擷取、封存、複製與再發布其內容；因此不以爬取報告或付費資料供應商接入美國 ISM PMI。台灣 CIER PMI/NMI 仍按官方公開趨勢表提供。
- 官方來源：[美國 DOL 每週失業救濟申請資料](https://oui.doleta.gov/unemploy/claims.asp/wkclaims/report.asp)、[FRED ICSA](https://fred.stlouisfed.org/series/ICSA)、[BLS PPI 資料指南](https://www.bls.gov/ppi/data-retrieval-guide/home.htm)、[主計總處 API 說明](https://nstatdb.dgbas.gov.tw/dgbasAll/download/API%E8%AA%AA%E6%98%8E%E6%96%87%E4%BB%B6.pdf)、[CIER PMI 趨勢頁](https://www.cier.edu.tw/pmi-trend/)、[ISM 使用條款](https://www.ismworld.org/supply-management-news-and-reports/reports/ism-pmi-reports/)。

### 21.3 英國零售銷售與其他經濟事件

- The consumption chart has a MoM/YoY toggle and compares matching frequencies only: U.S. retail sales MoM vs. UK retail sales volume MoM, or U.S. YoY vs. UK YoY. UK history uses OECD seasonally adjusted monthly volume growth series `GBRSLRTTO01GPSAM` (MoM) and `GBRSLRTTO01GYSAM` (YoY), via FRED; both remain in Python process-local TTL cache and do not add PostgreSQL observation rows. Each view shows only the two same-frequency country lines in its legend, axis, and hover readout. The native buttons support keyboard and screen-reader use.
- UK Retail Sales 公布日（例如 2026-10-23、2026-11-20、2026-12-18）沿 Finance Calendar 事件接入 consumption 群組，保留與美國同日公布事件不同的身份，不會被事件去重覆蓋。英國實際資料更新後，趨勢依該月份實際觀察值延伸；未發布的月份不補值。
- Finance Calendar 另保留美國中、高影響的 GDP、PCE／個人所得與支出、耐久財、工業生產、房屋開工／許可／銷售、消費者信心、貿易、庫存、工廠訂單、消費信貸、領先指標等事件。其他事件以各自名稱和日期列示，套用既有公布日前高亮；同日多事件使用標題雜湊識別，避免互相覆寫。低影響和非美國的一般事件不灌入「其他美國經濟事件」清單。
- ISM 事件僅顯示公布日與標題，不保存或重刊其 PMI 共識／實際數據，以遵守 ISM 未授權再發布限制。
- 來源：[ONS Retail Sales Index](https://www.ons.gov.uk/businessindustryandtrade/retailindustry/datasets/retailsales/current)（免費官方英國零售銷售量／值歷史資料及發布日程）、[OECD 英國零售銷售量 MoM](https://fred.stlouisfed.org/series/GBRSLRTTO01GPSAM)、[OECD 英國零售銷售量 YoY](https://fred.stlouisfed.org/series/GBRSLRTTO01GYSAM)、[Finance Calendar API](https://www.financecalendar.com/api/)。

## 22. 貨幣供給、全球流動性、利率曲線與信用違約（2026-10-17）

使用者要求首頁總經區補齊「世界金流、利率、違約率」。來源查證日期 2026-10-17；FRED 序列以公開 `fredgraph.csv` 核對最新觀察期，正式抓取走既有 keyed API。ECB、BoJ、CBC 三個 API 已從 OKE 節點實測 HTTP 200。

### 22.1 新增序列與來源

| 卡片 | 序列 | 來源／頻率 | 最新可得期（查證時） |
|---|---|---|---|
| 貨幣供給與流動性 | 美國 M2 `M2SL` | FRED（Fed H.6），月，USD billion | 2026-08 |
| | 歐元區 M2 名目存量指數 `BSI.M.U2.Y.V.M20.X.I.U2.2300.Z01.E` → `EZ_M2_INDEX` | [ECB Data Portal](https://data.ecb.europa.eu/)，月，季調 | 2026-08；由指數算的年增 3.24% 與 ECB 公布 3.2415% 一致 |
| | 日本 M2 平均餘額 `MAM1NAM2M2MO` → `JP_M2` | [BoJ 時系列 API](https://www.stat-search.boj.or.jp/)，月；1 億円換成兆円 | 2026-09 |
| | 台灣 M1B、M2 日平均 `EF15M01` → `TW_M1B`、`TW_M2` | 央行統計 API，月，新台幣百萬元 | 2026-08；M2 70,677,981，年增 6.79% 與官方欄一致 |
| | Fed 總資產 `WALCL`、TGA `WTREGEN`、隔夜逆回購 `RRPONTSYD` | FRED（H.4.1），週／日；百萬美元換成十億美元 | 2026-10-14／10-16 |
| | Fed 淨流動性 `US_NET_LIQUIDITY` = WALCL − TGA − RRP | 由上列三序列計算，週三對齊；RRP 缺當日時往前最多 7 日 | 推導值 |
| | 歐洲央行體系總資產 `ECBASSETSW`、日本央行總資產 `JPNASSETS` | FRED，週／月；換成十億歐元、兆円 | 2026-10-09／2026-09 |
| 利率 | SOFR、3M／2Y 公債、10Y−2Y、10Y−3M、10Y TIPS 實質殖利率、10Y 損益兩平通膨 | FRED，日 | 2026-10-15／16 |
| | ECB 存款利率 `ECBDFR`、英國 SONIA `IUDSOIA`、日本隔夜拆款 `IRSTCI01JPM156N` | FRED（後者為 OECD 月資料） | 2026-10-16／10-14／2026-09 |
| 信用與違約風險 | ICE BofA 高收益／投資級 OAS、Moody's Baa − 10Y | FRED，日 | 2026-10-15 |
| | 銀行逾期率（全部、企業、房貸、信用卡）、信用卡淨沖銷率 | FRED（Fed 季報），季 | 2026 Q2 |
| | 聖路易 Fed 金融壓力 `STLFSI4`、芝加哥 Fed `NFCI` | FRED，週 | 2026-10-09 |

### 22.2 規則與限制

- 新序列全部放 Python 行程快取，不寫 PostgreSQL（`save_observations` 逐列 SELECT，postgres 只有 100m CPU）。Pod 重啟後由下一輪抓取重建。
- FRED 每日預算 200：日頻 17 序列加 RSAFS／ICSA 與 5 個 release 每 6 小時一輪（約 96 次／日）；週／月／季頻 15 序列快取未滿 24 小時就跳過（約 15 次／日）。每次重啟會全抓 39 次。
- 各國 M2 幣別不同，只比成長率（`money` 成長圖，月增／年增切換）；央行資產負債表以各自幣別水位呈現。週頻與月頻序列不畫在同一張圖，避免日期軸交錯。
- 季頻期間以 FRED 首月表示（2026-04），畫面顯示為「2026 Q2」。
- **沒有免費的企業違約率**：Moody's／S&P 違約率需付費。違約風險以市場利差（預期）和銀行逾期／沖銷率（已實現）呈現，不可標成「違約率」。
- ICE BofA OAS 在 FRED 只開放近 3 年歷史，足夠 24 個月圖表。
- FRED 上的 OECD 歐元區／日本／中國 M2（`MABMM301*`）停在 2023 年或更早，不使用；中國人民銀行沒有可程式存取的 API，中國 M2 暫不接入。
- 尚未接入的候選：台灣本國銀行逾放比（央行／金管會）、中國社融。

### 22.3 驗收

- 測試：`maya-sawa/tests/test_market_macro_liquidity.py`（ECB／BoJ／CBC 真實回應 fixture 在 `tests/fixtures/macro/`）；前端 `tests/market/macroGroups.test.ts`、`macroLayout.test.ts`、`macroGrowth.test.ts`、`macroSeries.test.ts`。
- 部署後須確認：dashboard API 回傳上表序列、淨流動性有週資料、各卡片圖表無日期交錯、FRED 呼叫次數未超出每日預算。

### 22.4 存量視圖與長歷史（2026-10-17）

- 使用者回饋：M2 只看增速、Fed 圖線條太平，看不出故事。原因有三：
  - 只保存 24 個月歷史，而這兩年剛好平淡。
  - Fed 總資產（約 6,800B）和逆回購（約 0B）放在同一個軸上。
  - 座標軸往 0 以下延伸，出現 −843.5 的刻度。
- **長歷史：** M2、各國 M2、Fed／ECB／BoJ 資產、TGA、ON RRP、淨流動性改從 2019-01 起保存與回傳，涵蓋 2020 擴表、2022–23 M2 年減、逆回購 2.5T→0。
  - 後端：`LONG_HISTORY_CODES`、`fred_observation_start`、`snapshot_history`；FRED `limit` 改為 10000。
  - 前端：`MACRO_LONG_HISTORY_CODES` 不截斷這些序列。
- **M2 存量：** `money` 圖新增「存量 (2020-01 = 100)」並設為預設。四地各自以 2020-01 為 100 換成指數，因此可以畫在同一個軸上；讀值會同時顯示當地幣別的兆元金額。歐元區用的是 ECB 名目存量指數，所以只顯示指數。
- **Fed 圖拆成兩張：** 總資產＋淨流動性一張，TGA＋ON RRP 一張。全為非負值的序列，座標軸不再延伸到 0 以下。
- **行程快取上限：** 從 64 筆提高到 128 筆（54 個序列加約 13 個原始回應，原本會擠掉序列）。

## 23. 台股融資維持率與 VIX 同圖（2026-10-29）

新卡片「市場風險情緒」（`macroGroups.ts` 的 `market-risk`），兩條線畫在同一張圖：左軸是融資維持率（%），右軸是 VIX（點）。單位不同，`macroChartNeedsSeparateAxes` 會自動分軸。

**台股融資維持率（`TW_MARGIN_MAINTENANCE`，上市大盤）**
- 證交所不公布大盤維持率，由 maya-sawa 每天從兩張公開表計算（`market_macro.margin_maintenance`）：
  `維持率 = Σ(個股融資今日餘額（張）× 1,000 × 當日收盤價) ÷ 融資金額今日餘額（仟元 × 1,000）× 100%`。
  - 個股融資餘額：`MI_MARGN?selectType=ALL`（第一個「今日餘額」欄是融資，第二個是融券）。
  - 收盤價：`MI_INDEX?type=ALLBUT0999`。
  - 融資金額：`MI_MARGN` 的「信用交易統計」表「融資金額(仟元)」列。
- 2026-10-28 算出 183.26%（融資金額 6,322.99 億元；擔保品市值 11,587.38 億元）。當天 3 檔沒有收盤價（共 310 張），不計入分子，也不當成 0。
- 防呆：個股張數加總和「融資(交易單位)今日餘額」差超過 0.1% 就不算，避免表不完整時看起來像維持率下跌。假日或融資表先出、收盤表還沒出的日子不寫入。
- 只算上市（TWSE），不含上櫃（TPEx）。這是估計值：券商實際用的是個別帳戶的整戶擔保維持率，含其他擔保品與融券保證金。
- 每次總經更新（每 6 小時）最多補 20 個交易日、每天兩次請求、間隔 1 秒，從最新往回補，約一週補滿一年。

**VIX（`US_VIX`）**：CBOE 波動率指數日收盤，沿用既有 Yahoo 日收盤來源（`^VIX`），不佔 FRED 每日額度。一手來源是 CBOE 的 `VIX_History.csv`。

測試：maya-sawa `tests/test_market_macro_margin.py`（真實 2026-10-28 回應，只刪用不到的欄位，列數完整）、`tests/test_market_macro_sources.py`；前端 `tests/market/macroLayout.test.ts`、`tests/market/macroGroups.test.ts`。

### 23.1 放進「收斂：個股要盯的總經變數」（2026-10-29）

邏輯鏈檢視（預設檢視）的收斂區新增第五個焦點 `focus-leverage`「融資維持率與 VIX → 台股籌碼」，同一張圖、左右兩軸。三條鏈接進來：`fin-stress`（金融條件收緊時 VIX 先跳）、`tw-m1b-m2`（活存資金與融資一起擴張）、`yen-carry`（日圓急升引發去槓桿）。指標網格的「市場風險情緒」卡片保留。

**上線當天 VIX 是空的，原因是額度**：Yahoo 日收盤來源每天只預留 12 次。每次部署 pod 重啟都會先跑一次總經更新，而重啟後還原的黃金、日圓、美元指數仍被重抓。10/28 部署多次，額度在 VIX 上線前就用完（狀態 `yahoo_daily_budget_exhausted`），VIX 一次都沒抓到。修正：`_fetch_yahoo_markets` 跳過五小時內抓過的序列，全部都新鮮就不佔額度；新加的代碼（例如 VIX）不在快取裡，下一次更新就會抓。每 6 小時的排程仍會照常重抓。測試 `test_yahoo_markets_skips_series_restored_fresh_after_a_restart`。

### 23.2 韓國記憶體報價（2026-10-29 查證）

- DRAMeXchange（TrendForce）的 DRAM／NAND 現貨價要付費會員，沒有公開 API；網頁內容不能爬來用。
- 免費且官方的替代：韓國關稅廳在 data.go.kr 的品目別進出口實績 API（依 HS 代碼，記憶體是 HS 8542.32，月資料）。需要使用者自行在 data.go.kr 申請服務金鑰，存成 Jenkins credential 後才能接。
- 另一個不需金鑰的代理指標：SK hynix（`000660.KS`）、三星（`005930.KS`）、美光（`MU`）股價，可走既有 Yahoo 日收盤來源。

### 23.3 其他來源的「額度用完」（2026-10-29）

同一天的來源狀態裡，PMI、WorldBank、DGBAS、DGBASPrices 也都是 `*_daily_budget_exhausted`。原因各不相同：

| 來源 | 真正原因 | 修正 |
|---|---|---|
| PMI（中經院） | `/pmi-trend/` 改版：只剩一張表，欄位是「臺灣製造業PMI」加六個產業分項；NMI 表消失（`/nmi-trend/` 是 404）。解析器要求 PMI 和 NMI 都有，所以每次都失敗、每次都扣額度，從未成功過。 | NMI 改為選填；依表頭找「臺灣製造業PMI」那一欄，不再固定讀第 2 欄。整張表不見才報 `cier_pmi_table_missing`。`TW_NMI` 暫時沒有資料，需另找來源。 |
| WorldBank（月金價） | worldbank.org 和 thedocs.worldbank.org 對 urllib 預設 User-Agent 回 403，從未成功過。 | 兩個請求都帶瀏覽器 User-Agent（`BROWSER_AGENT`，與 Yahoo 共用）。 |
| DGBAS、DGBASPrices | 部署重啟後還原的月資料仍被重抓（與 Yahoo 同一個問題）。另外額度用 `LIKE 'DGBAS%'` 計算，DGBASPrices 的每次請求也算進 DGBAS。 | 12 小時內抓過就跳過、不佔額度；額度改成來源名稱完全相同才計入。 |

測試：maya-sawa `tests/test_market_macro_free_sources_budget.py`（中經院頁面、世界銀行頁面與 xlsx 都是 2026-10-29 真實回應的裁剪版，放在 `tests/fixtures/macro/`），`tests/test_market_macro_budget.py::test_a_source_budget_counts_only_its_own_calls_not_names_that_start_with_it`。

### 23.4 融資餘額、成交量與 VIX 合成一個指標（2026-10-29）

收斂區的 `focus-leverage` 改成「融資餘額、成交量與 VIX → 台股籌碼」，三條線一張圖：左軸融資餘額、右軸成交量（都是億元），外側右軸 VIX。融資維持率移到「市場風險情緒」卡片裡自己一張圖。

| 代碼 | 定義 | 來源與抓法 |
|---|---|---|
| `TW_MARGIN_BALANCE` | 上市融資金額「今日餘額」（仟元）× 1000 ÷ 1 億 | 與維持率同一份 `MI_MARGN`，不多打請求。回補時某天缺維持率或餘額任一個就要抓；只缺餘額時不再抓 `MI_INDEX`。 |
| `TW_MARKET_TURNOVER` | 上市大盤成交金額（元）÷ 1 億，民國日期轉西元 | `FMTQIK`，一次回整個月的每日資料。每次更新都抓當月；以前的月份只有完全沒資料時才補，約 13 個月。五小時內抓過就跳過。額度名稱 `TWSETurnover`，每天 8 次。 |

10/28 實際值：融資餘額 6,323.00 億、成交金額 7,503.41 億。

測試：maya-sawa `tests/test_market_macro_margin.py`（新增 5 個，`tests/fixtures/twse/fmtqik_2026-10.json` 是 2026-10 的完整真實回應）；前端 `tests/market/macroGroups.test.ts`、`macroLayout.test.ts`、`macroChains.test.ts`。

### 23.5 一張圖、多個 y 軸（2026-10-29）

收斂區的 `focus-leverage` 和「市場風險情緒」卡片的主圖，現在把五條線畫在同一條時間軸上：融資餘額、成交量、VIX、台指期轉倉超額價差、融資維持率。y 軸按單位分配，同單位的線共用一個軸，單位不同才分開（`macroLayout.ts` 的 `macroAxisPlan`）：

| 軸 | 位置 | 線 |
|---|---|---|
| 0 | 左 | 融資餘額、成交量（億元） |
| 1 | 右 | VIX（點） |
| 2 | 外側右 | 轉倉超額價差（台指點） |
| 3 | 外側左 | 融資維持率（%） |

最多四個軸；第五種以上的單位會和第四軸共用。原始次月減近月價差另畫一張圖，因為同一條序列只畫一次。

**一整年的資料：**
- 成交量（FMTQIK）與轉倉價差（TAIFEX）一次補 13 個月。
- VIX 從 Yahoo 一次抓一年。
- 融資餘額與維持率要逐日向 TWSE 抓，每次更新從 20 天改成 60 天，約一天補滿一年。

### 23.6 台指期轉倉超額價差（`TX_ROLL_EXCESS_SPREAD`、`TX_CALENDAR_SPREAD`）

公式與純函式在 maya-sawa `maya_sawa/services/futures_roll.py`，抓取在 `MarketMacroService._fetch_tx_roll_spread`：

- 價差：次月結算價 − 近月結算價（期交所 futDataDown，TX，一般盤，只取月合約）。近月是到期日（第三個星期三）還沒過的第一個合約。
- 合理價差：$F_{近月}\times r\times 天數/365 - D$。
  - $r$ 用央行重貼現率 `CBC_REDISCOUNT`，取當天有效的值。
  - 天數是兩個到期日的間隔。
  - $D$ 是除息日落在（近月到期日，次月到期日］之間的現金股利點數：每股現金股利 × 已發行股數 ÷ 指數除數。
- 除數：上市公司收盤價 × 已發行股數的總和 ÷ 加權指數，取最近交易日。2026-10-28 約 32.8 億，對應市值約 154 兆元。
- 股利資料：
  - 已除息的用 TWT49U，只取「息」。「權息」把股票股利和現金股利合成一個數字，無法拆開，所以不計入，會稍微低估 D。
  - 未來的用 TWT48U 的「現金股利」欄。「待公告…」或 0 的不計入。
  - ETF 不在已發行股數清單裡，自然排除；加權指數本來也不含 ETF。
- 限制：
  - 到期日遇假日順延沒有建模。
  - 除數用單一參考日，期間的增資或新上市會造成小幅誤差。
  - 次月成交量小，結算價是期交所依規則訂的，不一定是實際成交價。
- 2026 年實測：6～10 月超額價差一直是正的，約 +50 到 +290 點，表示期貨長期比合理值貴。10/28 的價差是 122 點，合理值 72.49 點，超額 49.51 點。

測試：maya-sawa `tests/test_futures_roll.py`，共 11 個。fixture 是真實回應的裁剪版：`tests/fixtures/taifex/tx_2026-10-27_28.csv`，以及 `tests/fixtures/twse/` 裡的 `t187ap03_L`、`twt48u`、`twt49u`，另外在 `mi_index` 加上加權指數那一列。前端測試：`macroLayout.test.ts`（`macroAxisPlan`）、`macroGroups.test.ts`、`macroChains.test.ts`。
