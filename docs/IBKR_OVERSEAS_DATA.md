# IBKR overseas data collection

## Verified source inventory (2026-10-16)

Existing integration used portfolio accounts, positions, ledger and summary only. Newly verified against the authenticated production Gateway for META (US), LITE (US), 6857 (JP Advantest), 6524 (JP Kohoku), 000660 (KR SK Hynix):

| Source | Data | Storage / refresh |
| --- | --- | --- |
| `/iserver/contract/{conid}/info` | company name, symbol, currency, exchange, sector/category | PostgreSQL; weekly |
| `/iserver/marketdata/history` | initial one-year daily OHLCV; incremental week after initial backfill | PostgreSQL raw response and dated normalized bars; six-hour refresh |
| `/iserver/marketdata/snapshot` | last, high/low, change, bid/ask, volume, historical volatility, availability when entitled | PostgreSQL; 240 seconds; preflight retry; missing permissions back off one hour |
| existing portfolio snapshot | private positions and valuation | PostgreSQL first, Redis cache second; 15-minute archive buckets; DB fallback after Redis loss |

Research requests read DB with a 60-second local process cache; never call the Gateway on a page request. Contract identity is market + code + IB conid. A failed/empty fetch records status without erasing last successful data. Quote archive buckets are 15 minutes. The daily bar timestamp is converted using each market's timezone. Raw OHLC prices are already scaled; volume is multiplied by `volumeFactor`, while raw volume and factor are retained. Invalid zero-price bars are retained in raw source responses but excluded from normalized analysis bars.

Public endpoint: `/api/market/dashboard/overseas/{code}?market=US|JP|KR|HK`. It exposes only public instrument/market datasets. Reserved private account snapshots have no public read route. Never include account IDs, quantities, cost, value or P/L in research responses.

## Confirmed source gaps

IBKR Web API changelog (2026-01-06) deprecated EPS, PE, market capitalization, dividends/yield, ex-date and beta snapshot fields. CPAPI endpoints above do not provide complete quarterly statements, analyst consensus, Taiwan-style institutional flows, ownership tiers or short interest. No paid regulatory snapshots, new market subscriptions or paid providers are enabled. Sources still needed for these datasets: official US SEC/company filings; Japan company IR/EDINET (check key requirements); Korea company IR/OpenDART (key required). Do not invent these fields or map overseas numeric codes to TWSE/TPEx.

Official references:
- https://www.interactivebrokers.com/docs/web-api/changelog
- https://www.interactivebrokers.com/docs/web-api/v1/endpoints/market-data/historical-market-data
- https://www.interactivebrokers.com/docs/web-api/v1/endpoints/market-data/market-data-fields
- https://www.interactivebrokers.com/docs/web-api/v1/endpoints/contract/contract-information-by-contract-id

## Verification

Backend: `poetry run python -m pytest tests/test_ibkr_research.py tests/test_market_dashboard.py tests/test_market_brief.py -q`.
Read the public endpoint after deployment; verify profile conid/company/exchange, daily count and dates, persisted=true, source coverage, gaps and quote availability for all five holdings. A new DB instance must be able to read the same data without Redis. Confirm Jenkins success and the production image revision before claiming deployment complete.

## 2026-10-20 日本財報：TDnet 決算短信（免 key）

- **來源**：東證適時揭露 TDnet（`https://www.release.tdnet.info/inbs/I_list_NNN_YYYYMMDD.html`）。決算短信與業績予想の修正附 XBRL zip，公開下載，不需要 key。EDINET 需要 key，而且日本從 2024 年起取消法定季報，EDINET 只剩半年報和年報；季度數字只在決算短信裡，所以日本改用 TDnet。
- **收集**：maya-sawa `services/tdnet_financials.py`，背景每 3 小時掃一次，不依賴 IB 登入。持股清單取自曾經用 IB 收集過 profile 的日本代碼（`market_codes("JP")`），TDnet 代碼為四碼加 `0`（6857 → 68570）。第一次執行回補 31 天，之後只從上次掃到的前一天開始掃（至少 3 天），掃描進度存成 `_TDNET / JP / tdnet_scan`。
- **保存**：每份公告存成 `tdnet_release`（period = TDnet 檔名，同一份不會重複下載），再把全部公告合成 `financials`，格式和 SEC 一樣，前端「基本面」直接沿用。
- **數字規則**：
  - 金額一律換成日圓（不是百萬）；EPS 是日圓／股。附件報表（千日圓）比摘要（百萬日圓）精確，同一個科目以附件為準；但會先比對科目名稱，例如股東權益取「自己資本」，不取含非控制權益的「純資產」。
  - 決算短信報的是年初至今的累計數。Q1 本身就是 3 個月；Q2 以後的單季是兩份連續累計公告相減，標示 `derivedFromYtd`。相減出來的單季不給 EPS，因為股數會變，EPS 不能相加減。
  - 公告同時附了去年同期的累計數，所以 YoY 從第一份公告起就能算；QoQ 要等收到第二份。
  - 業績予想の修正只取修正後的預測（`CurrentMember`），修正前的預測（`PreviousMember`）丟掉；上下限區間也不存。
  - 值為空（`xsi:nil`）的欄位是自我結束標籤，不能當成一般開關標籤解析，否則會吞掉後面的欄位。
  - 同一期間如果之後有訂正公告，以較晚的為準。
- **限制**：TDnet 只保留約一個月，所以過去的季度改由 J-Quants 補（見下節）。持股是 Advantest（6857，IFRS，3 月制）和湖北工業 Kohoku Kogyo（6524，J-GAAP，12 月制）。
- **測試**：`maya-sawa/tests/test_tdnet_financials.py`。fixture 是 2026-10-15 到 10-20 真實下載的 J-GAAP 半期、IFRS 年度、預測修正 XBRL，以及一頁日列表。前端是 `tests/market/overseasResearch.test.ts`。

## 2026-10-20 韓國財報：OpenDART 定期報告

- **Key**：Jenkins Secret text `OPENDART_API_KEY`（vinskao 資料夾）→ maya-sawa Jenkinsfile 的 `Configure Filings Keys` 階段建立 k8s secret `filings-credentials` → pod 環境變數。沒有 key 時收集器不啟動，部署也不會因此失敗。key 只放在請求參數裡：錯誤訊息不帶 URL，不寫進 log 或資料庫。
- **收集**：maya-sawa `services/dart_financials.py`，背景每 12 小時跑一次，對象是曾經用 IB 收集過 profile 的韓國代碼。流程：`corpCode.xml` 找出 corp_code（之後存成 `dart_corp_code`）→ `list.json` 取近 3 年的定期報告（同一期有訂正版時以訂正版為準）→ 每份報告用 `fnlttSinglAcntAll.json` 抓一次，先試合併報表 CFS，沒有再改抓個別報表 OFS。每份報告存成 `dart_release`（period = 接收編號），不會重複抓。
- **數字規則**：
  - 金額為韓元（不是百萬）。
  - 季報的損益表直接報單季（`thstrm_amount`）、年初至今（`thstrm_add_amount`），也附去年同季和去年同期累計，所以單季不用推算。
  - 年報只有全年，第四季 = 年報 − 第三季累計，標示 `derivedFromYtd`。
  - 同一季同時有申報值和推算值時，以申報值為準。這個合併邏輯和 TDnet 共用。
  - 流動資產與流動負債有申報，前端的流動比率因此有值。
- **核對**：SK 海力士 2025Q4 推算營收 32.83 兆韓元，和 Yahoo 另外公布的季營收一致。
- **測試**：`maya-sawa/tests/test_dart_financials.py`。fixture 是 2026-10-20 在正式 pod 內抓的 SK 海力士真實回應（2025Q3、2025 年報、2026Q1、2026 半年報、申報清單），只保留用到的科目，裡面不含 key。

## 2026-10-21 日本歷史財報：J-Quants（JPX 官方）

TDnet 只保留約一個月，新加入的日本持股會沒有歷史。改用 J-Quants，任何新的日本代碼第一次就會補齊兩年，不用逐家抓官網 PDF。

- **Key**：Jenkins Secret text `JQUANTS_API_KEY`（vinskao 資料夾）→ maya-sawa Jenkinsfile 的 `Configure J-Quants Key` 階段建立 k8s secret `jquants-credentials` → pod 環境變數 `JQUANTS_API_KEY`（optional，沒有 key 時收集關閉）。key 放在 `x-api-key` header，不寫進 log、資料庫或回應。
- **端點**：`GET https://api.jquants.com/v2/fins/summary?code=6857`，回傳 `data` 陣列，有 `pagination_key` 就繼續翻頁。所有欄位都是字串，`""` 代表沒有值。
- **免費方案限制**：
  - 只有兩年歷史，而且不含最近 12 週。
  - 最近 12 週由 TDnet 補。新加入的持股，若最新一季是 1～3 個月前公布的，要等它滿 12 週後才會補進來。
  - 每分鐘 5 次請求，所以每次請求間隔 13 秒。
  - 只有決算短信摘要，沒有完整損益表／資產負債表（那是 Premium），所以沒有毛利。
- **收集**：maya-sawa `services/jquants_financials.py`，背景每 24 小時跑一次，對象是曾經用 IB 收集過 profile 的日本代碼（`market_codes('JP')`）。
  - 每筆摘要存成 `jquants_release`，period = `DiscNo`。只有股利的公告和 REIT 公告存成空的。
  - 2026-10-23 起每次都重新解析抓到的摘要，結果和已存的不同才改寫。原因：負債欄位加上後，舊摘要因為「看過就跳過」一直沒有負債，6857 的財務結構圖因此是空的。
  - 存完後用 `tdnet_financials.rebuild_japan` 把 TDnet 和 J-Quants 合成 `financials`。
- **數字規則**：
  - 摘要是年初至今累計，Q1 是三個月。第二季以後的單季用相鄰兩次累計相減，標示 `derivedFromYtd`。
  - 負債 = 總資產 `TA` − 純資產 `Eq`，所以負債比有歷史。J-GAAP 下是精確值；IFRS 的 `Eq` 若不含非控制權益，這部分會算進負債（Advantest 的差距很小）。
  - `Eq` 在 J-GAAP 是純資產，含少數股權。自有資本改用 `TA × EqAR` 推算；`Eq` 與推算值差在 0.05% 總資產以內時（IFRS 通常如此）直接用 `Eq`。
  - 預測取自三組欄位：當年度 `F*`、上半年 `F*2Q`、年度決算時的下年度 `NxF*`（下年度淨利欄位是 `NxFNp`）。業績予想の修正只有預測，沒有實績。
- **兩個來源合併**（`build_financials`，TDnet、OpenDART 共用）：
  - 同一期間按指標逐一合併，後面那份留空的指標不會蓋掉前面的值。
  - 同一份決算短信同時有 TDnet 和 J-Quants 時，TDnet 優先（附件 XBRL 較完整、有毛利）。
- **核對**：
  - Advantest 共 9 季（2024Q1～2026Q1）。2025 年度第四季推算營收 = 1,128,610 − 800,537 = 328,073 百萬日圓。
  - 6524 是湖北工業（Kohoku Kogyo，J-GAAP，12 月制），不是 Lasertec（Lasertec 是 6920）。
- **測試**：`maya-sawa/tests/test_jquants_financials.py`。fixture 是 2026-10-21 在正式 pod 內抓的 6857、6524 真實回應，不含 key。

### 日本持股缺哪些圖、從哪裡補（2026-10-23）

| 頁面區塊 | 需要的欄位 | J-Quants 免費摘要 | TDnet 決算短信附件 | EDINET 半期／有報 |
|---|---|---|---|---|
| 財務結構・負債比 | 負債、總資產 | 有（TA − Eq） | 有 | 有 |
| 財務結構・流動比 | 流動資產、流動負債 | 沒有 | 有（`CurrentAssets(IFRS)`、`CurrentLiabilities`／`TotalCurrentLiabilitiesIFRS`） | 有 |
| 庫存 | 存貨、銷貨成本 | 沒有 | 有（IFRS 是 `InventoriesCAIFRS`） | 有 |
| 現金流・資本支出 ÷ 營業現金流 | 取得不動產廠房設備 | 沒有 | 有（`PurchaseOfPropertyPlantAndEquipmentInvCF(IFRS)`，原為負數，存成正數） | 有 |

- TDnet 只保留約一個月，所以附件只補「之後新公布」的季度。Advantest 下一次是 10/28。
- 庫存天數要同一季的存貨和單季銷貨成本；第二季以後的單季成本要用上一季累計相減，而 J-Quants 沒有銷貨成本，所以光靠 TDnet，第一份財報公布後庫存圖還是畫不出來，要累積幾季，或接 EDINET 補歷史。
- EDINET（金融廳）有完整報表，但需要 API key（要用簡訊驗證註冊，只能由擁有者申請）。
