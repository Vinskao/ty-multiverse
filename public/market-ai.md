# AI market research guide / AI 市場研究指南

Open **AI analysis / AI 分析** after Fundamentals. The research prompt is visible above the editor on every instrument; read it before writing. The Copy button copies the full prompt.

## Research quality SOP / 產業研究品質準則

General ETF Research shows allocation ratios only (holdings / sectors / regions / assets, each with its own date and source). Do not create company technology maps, three-axis assessments or a lean for a broad ETF. Add theme research only for an explicit industry theme, such as electric vehicles. Follow the ETF schema in the guide below.

一般 ETF 的 Research 只顯示配置比例與來源／日期；有明確產業主題（例如電動車）才加主題研究。不可因大型股 ETF 持有 Tesla 就將整檔基金視為電動車主題。

Before updating a Research record, read [Research standards and the complete AI update prompt](https://peoplesystem.tatdvsonorth.com/tymultiverse/research-guide.md).
It defines claim-level sources, diagram edge semantics, comparable competitor KPIs, commercialization evidence, the technology-to-cash-flow bridge, counterarguments and six delivery gates. It also includes the existing JSON shape and revision-safe save workflow.

更新 Research 前必須先讀上述指南，按「證據 → 技術比較 → 商業化 → 財務影響 → 反證」完成研究。圖不是名詞清單；路線圖、系統架構與採用進度不能混為一條箭頭。圖中重要主張應能追到特定文件、日期與頁碼，未知要保留未知。指南取材自 CFA 與 Morgan Stanley 公開研究方法，是本站自行整理的流程，並非高盛或任何機構的內部 SOP。保留既有三軸規則，但將營運偏向與估值／風險報酬判斷分開說明。

## Research before writing

## Always discover new data / 每次重新發現新數據

Start every run by GETting the current dashboard, `/api/market/dashboard/brief`, macro and events JSON with a fresh request. Enumerate **all** automatic + custom instruments and the fixed index future; do not reuse an old code list. Read each current analysis and revision, compare its stated data cutoff with the latest **reference period / trading date / publication date**, then update missing or outdated records. A newer `fetchedAt` alone does not prove a new publication. Revised values for the same period also require review. Record the periods checked, source timestamps, remaining gaps and what changed in the commentary.

Overseas instruments must use code + market and their own stored IBKR data:
`GET https://peoplesystem.tatdvsonorth.com/tymultiverse/api/market/dashboard/overseas/{code}?market=US|JP|KR`.
This DB-only endpoint includes company/exchange identity, quote availability, normalized daily OHLCV, 5/10/20/60-session moving averages, RSI(14, Wilder), collection coverage and gaps. Read `datasets.*.fetchedAt`, `technical.asOf`, and the latest bar date separately; broker snapshot capture time is not necessarily trade time. Inspect `availability` for live/delayed/frozen/not subscribed status. Do not label an IB position valuation as a real-time exchange print. Do not fabricate unavailable volume/change/financials. Snapshot fundamental tags (EPS, PE, market cap, dividend yield, beta) were deprecated by IBKR on 2026-01-06; obtain financial statements from company filings or other verified sources, not Taiwan endpoints.

For overseas AI records use `6857-JP`, `6524-JP`, `META-US`, `LITE-US`, `000660-KR`; never request Taiwan fundamentals/history for those codes. For Taiwan stock futures use the underlying stock's record. Update shared macro commentary first, cite its saved revision in each instrument note, and verify every target has a saved conclusion after the run. Start each instrument note with exactly one of `【結論】買`, `【結論】中立`, `【結論】賣` so the UI can show a distinct rating badge. Distinguish a current rating from a conditional future upgrade/downgrade.

Treat the saved commentary as a shared, versioned research note. Recheck the instrument identity and current site data, then independently verify the most recent company focus, technical position, fundamentals, institutional flows, ownership changes, margin/short activity and valuation where reliable. The visible prompt specifies the full research process and output structure.

**How to decide / 判斷方式**: 判斷核心：買／中立／賣的方向只由三項決定——循環（產業與需求循環位置）、技術力（技術路線與競爭門檻）、交貨（出貨、營收、產能與交期的實際證據）。每項標順風／中性／逆風：≥2 項順風且無逆風＝買；≥2 項逆風＝賣；其餘＝中立。總經、價格、籌碼只用來決定進場時機與風險，不推翻三項判斷；若要偏離規則必須寫明理由。

**Research maps / 研究圖**: before writing, read `GET /tymultiverse/api/market/dashboard/analysis/{code}?productType=research` (the Research tab, right before AI analysis). It holds the supply-chain and technology Mermaid flowcharts and the cycle / technology / delivery views. When new filings change a view, update the same record (JSON fields: name, market, asOf, summary, supplyChain, technology, assessment.cycle/technology/delivery {view: 順風|中性|逆風, note}, lean, leanReason, watch, sources with https URLs; Mermaid flowcharts only, no click/links). Records are kept permanently, also after an instrument leaves the holdings; `GET /tymultiverse/api/market/dashboard/research` lists them all.

Your conclusion must explicitly be **Buy / Neutral / Sell (買／中立／賣)**, with a time horizon, supporting and opposing evidence, key support/resistance and the conditions that would change the rating. Distinguish intraday from closing prices. Timestamp all data, separate facts from inference, link primary sources, and identify unavailable or uncertain information. Do not infer valuation from growth alone, invent numbers, or repeat another model's claims without checking them. This is general research, not individualized investment advice.

## Research reports

Before writing each stock or macro analysis, check research-report claims in a fixed order. A newly published claim is new evidence: update every affected instrument even when prices, revenue and positioning have not changed. Do not skip an instrument merely because there is no new market-data cutoff when a relevant report claim is new.

For each stock, call these public endpoints separately, in order. Do not combine `code` and `segment`: the API treats them as an AND filter.

1. `GET https://peoplesystem.tatdvsonorth.com/maya-sawa/market/reports/claims?code={url-encoded-code}` to retrieve claims naming the ticker.
2. `GET https://peoplesystem.tatdvsonorth.com/maya-sawa/market/reports/claims?segment={industry-segment}` to retrieve claims about the same industry layer, including claims that do not name a company. Merge and deduplicate these results. For macro and cloud-capex analysis, query `segment=csp` and `segment=macro`.
3. Only after claim lookups, use `GET https://peoplesystem.tatdvsonorth.com/maya-sawa/market/reports/search?q={url-encoded-question}&include_private=false` for a targeted full-text question such as `CoWoS capacity`. Published analyses must use public reports only; never opt into private report search because the analysis is shared publicly. This step requires OpenAI embeddings. If it returns 503, has no quota or has no results, record that semantic search was skipped and continue using the claims from steps 1 and 2. Never discard available claims because vector search failed.

Add a `Report perspectives` section to affected analyses. For every cited claim, identify the publisher, report title, publication date and page number; summarize rather than quote at length. If a report argues against the current rating, explicitly state whether the rating is maintained or changed and why, comparing the report evidence with current hard data. A report claim is a research view, not a verified fact. If a number appears only in an unextracted chart, state `Chart content not extracted` and do not infer its value. Private reports are excluded from public claim results. Public analysis routines must not include private report content.

## Watchlist nominations / 觀察名單提名

讀研究報告主張時，若報告點名一檔**目前不在儀表板**的台股（4 位數代碼），而且主張有具體的循環、技術力或交貨證據，就把它提名進 custom 區。這是你以研究員身分的判斷，不是把報告提到的股票全部加進來。

1. 先 `GET https://peoplesystem.tatdvsonorth.com/maya-sawa/market/watch` 看目前在名單內（`watching`）與候選（`candidates`）的標的，避免重複，並優先處理還在候選、這輪又有新報告支持的標的。
2. 提名：`curl -sS -X POST https://peoplesystem.tatdvsonorth.com/maya-sawa/market/watch -H "Content-Type: application/json" --data-binary @nomination.json`，內容 `{"code": "3711", "reason": "…", "reportIds": ["…"], "conviction": "normal"}`，用 python json.dump 產生。寫入 key 由雲端環境的代理自動加入，不要自行設定。
   - `reason`：10–300 字，寫明哪份報告的哪項證據（循環／技術力／交貨），以及它為什麼值得追蹤；不要寫「看好」這類沒有證據的話。
   - `reportIds`：支持這個判斷的公開報告 `report_id`（從 claims 回應取得），1–10 份。系統會驗證報告存在且公開。
   - `conviction`：預設 `normal`。只有在報告給出明確的訂單、產能或營收證據、而且你用最新資料核對過時才用 `high`。
3. 進名單的條件：兩份**不同**的報告在 21 天內都支持它（一次提名引用兩份報告即可），或是一次 `high`。只有一份報告時它是候選，不會出現在 custom 區。
4. 留多久：每次有新的報告支持（重新提名並引用新報告）就續期；30 天沒有任何報告再提到，就自動移出，你不需要處理。名單同時最多 3 檔，額滿時新進的會取代被冷落最久的（待滿 7 天以上才會被取代）。
5. 擁有者買入後，它變成一般持股（自動區），不再算名單；賣出後若報告仍支持，會再回到 custom 區。系統自己處理，你不要為此提名。
6. 每輪最多提名 3 檔。不要提名已是持股的標的（會回 422）、非台股（422）或沒有報告依據的標的。同一份報告同一天重複提名不會重複計算。
7. 進名單的標的下一輪會出現在 `GET /tymultiverse/api/market/dashboard` 的 `custom`（`source` 為 `ai-watch`，附 `reason`、`expiresAt`），照一般標的寫分析；在「公司定位」註明它因哪些報告進入名單與預計到期日。系統在標的剛進名單時會自動補歷史資料並產生第一份分析，不必等排程。

## Browser workflow

1. Sign in to TY Multiverse, select an instrument, and open AI analysis.
2. Read the visible research prompt, current saved commentary and history. The editor is prefilled with the current commentary. Enter your AI/model name and update the existing note with your evidence, rating and changes.
3. Click **Update analysis**. Confirm the saved revision number and verify the saved table contains your model and new commentary. A draft alone is not saved.
4. If another writer updated the record, reload, reconcile the newer commentary, and save against the latest revision. Never overwrite an unseen update.

## Phone chat apps (Claude / ChatGPT) / 手機 AI app

The home page is rendered by JavaScript, so a chat app's web reader may only see "Loading…". Read these public JSON URLs instead (no sign-in needed):
首頁由 JavaScript 載入，手機 AI 讀網頁可能只看到「載入中」，請直接讀以下公開 JSON：

- Dashboard / 標的清單與報價: https://peoplesystem.tatdvsonorth.com/tymultiverse/api/market/dashboard
- Macro data / 總經數據: https://peoplesystem.tatdvsonorth.com/tymultiverse/api/market/dashboard/macro
- Shared macro commentary / 總經評論: https://peoplesystem.tatdvsonorth.com/tymultiverse/api/market/dashboard/analysis/US?productType=macro
- Company events / 公司事件: https://peoplesystem.tatdvsonorth.com/tymultiverse/api/market/dashboard/events
- Daily history / 日線與籌碼: https://peoplesystem.tatdvsonorth.com/tymultiverse/api/market/dashboard/history/{code}
- Fundamentals / 基本面: https://peoplesystem.tatdvsonorth.com/tymultiverse/api/market/dashboard/fundamentals/{code}
- Current analysis and history / 目前評論與版本: https://peoplesystem.tatdvsonorth.com/tymultiverse/api/market/dashboard/analysis/{code}?productType=stock
- Research map / 研究圖（供應鏈、技術、循環／技術力／交貨）: https://peoplesystem.tatdvsonorth.com/tymultiverse/api/market/dashboard/analysis/{code}?productType=research
- All research maps / 全部研究紀錄: https://peoplesystem.tatdvsonorth.com/tymultiverse/api/market/dashboard/research

Chat apps cannot sign in, so they cannot save. Reply with the complete commentary as plain text, together with your model name and the revision you based it on. The user pastes it into the AI analysis editor while signed in and saves it there.
手機 AI 無法登入，不能直接儲存：請把完整評論以純文字回覆，並附上模型名稱與依據的版本號，由使用者登入後貼到 AI 分析編輯框儲存。

## API workflow

- Dashboard: `GET /tymultiverse/api/market/dashboard`
- Read: `GET /tymultiverse/api/market/dashboard/analysis/{code}?productType=stock`
- Update: `PUT` the same URL with `Content-Type: application/json` and `Authorization: Bearer <your existing signed-in access token>`.
- Use `productType=futures` for index futures. For stock futures with a known `underlyingCode`, use the underlying stock code and `productType=stock`, as the UI does.
- Read access is public. Updates require a valid signed-in identity. Never print access tokens, put them in a URL, or include them in commentary.

Update JSON:

```json
{
  "model": "Your own AI/model name",
  "content": "Your complete updated research commentary",
  "expectedRevision": 0
}
```

Use the revision returned by GET; **0 is only for an absent record**. Model names are limited to 120 characters and commentary to 20,000 characters. On `409`, GET again and reconcile your draft. On `401`, sign in again. On `503`, keep the draft and retry later; do not report that it was saved. Repeating the same successful request does not create another version.


研究時一併檢視首頁「近期公司事件」表，將月營收／財報實際公布日與法說會預定日期放入時間線；清楚區分已公布和預定事件，不猜測未公告日期。

撰寫前先決定敘事主軸：**top-down**（美國總經 → 資金與風險偏好 → 台股／產業 → 公司 → 價格與籌碼）或 **bottom-up**（公司營運 → 產業地位 → 總經順逆風 → 價格與籌碼是否已反映），寫成一條因果完整的敘事。總經資料來自首頁「多國重要總體經濟資料」（美國、台灣等）與 `GET /tymultiverse/api/market/dashboard/macro`；只引用已公布數據，並把下次總經公布日放進事件時間線。

**技術實力為必寫段落**：每次都要查公司最近一次法說簡報／逐字稿、技術論壇、年報與重大訊息，寫出最新公布的技術路線與量產時程、相對競爭者的位置，並區分已量產、驗證中、規劃中；剛公布的財報或法說必須納入。

總經評論是獨立一層：首頁「總經評論」由 `GET/PUT /tymultiverse/api/market/dashboard/analysis/US?productType=macro` 讀寫（寫入需登入，版本規則與個股相同）。總經數據公布後先更新這份評論；個股與期貨分析只引用它的結論與版本號，再寫本標的的敏感度與傳導路徑，不重複總經數據。若總經評論早於最新總經公布，先更新它再寫個股。
