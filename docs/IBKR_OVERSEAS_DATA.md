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
- **限制**：TDnet 只保留約一個月，歷史從 2026-10 開始累積。Advantest（6857，IFRS，3 月制）和 Lasertec（6524，J-GAAP，6 月制）下一次公布後，網站才會出現數字。
- **測試**：`maya-sawa/tests/test_tdnet_financials.py`。fixture 是 2026-10-15 到 10-20 真實下載的 J-GAAP 半期、IFRS 年度、預測修正 XBRL，以及一頁日列表。前端是 `tests/market/overseasResearch.test.ts`。
- **韓國**：OpenDART key 已申請（2026-10-20 核准），待存入 Jenkins `OPENDART_API_KEY` 後再接。
